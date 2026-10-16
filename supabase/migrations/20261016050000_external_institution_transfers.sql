alter table public.demo_transfers
  alter column receiver_account_id drop not null,
  add column recipient_name text,
  add column recipient_institution text,
  add column recipient_account_last4 text;

alter table public.demo_transfers
  add constraint demo_transfers_recipient_details_check check (
    (
      receiver_account_id is not null
      and recipient_name is null
      and recipient_institution is null
      and recipient_account_last4 is null
    )
    or (
      receiver_account_id is null
      and char_length(trim(coalesce(recipient_name, ''))) between 2 and 80
      and char_length(trim(coalesce(recipient_institution, ''))) between 2 and 80
      and recipient_account_last4 is not null
      and recipient_account_last4 ~ '^[0-9]{4}$'
    )
  );

create function public.simulate_external_transfer(
  p_sender_account_id uuid,
  p_amount numeric,
  p_memo text,
  p_transfer_type text,
  p_recipient_name text,
  p_recipient_institution text,
  p_recipient_account_number text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  sender_account public.bank_accounts%rowtype;
  transfer_id uuid;
  transfer_amount numeric(12, 2) := round(p_amount, 2);
  transfer_memo text := left(trim(coalesce(p_memo, '')), 120);
  recipient_name_text text := left(trim(coalesce(p_recipient_name, '')), 80);
  recipient_institution_text text := left(trim(coalesce(p_recipient_institution, '')), 80);
  recipient_account_last4 text;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to submit a simulated transfer';
  end if;
  if p_amount is null or p_amount::text = 'NaN'
     or p_amount < 0.01 or p_amount > 10000
     or p_amount <> transfer_amount then
    raise exception 'Enter a transfer amount from $0.01 to $10,000 with at most two decimal places';
  end if;
  if p_transfer_type is null or p_transfer_type not in (
    'ach', 'same_day_ach', 'wire', 'rtp', 'fednow', 'p2p'
  ) then
    raise exception 'Choose a supported external transfer method';
  end if;
  if char_length(trim(coalesce(p_recipient_name, ''))) not between 2 and 80
     or char_length(trim(coalesce(p_recipient_institution, ''))) not between 2 and 80 then
    raise exception 'Enter the recipient name and institution';
  end if;
  if p_recipient_account_number is null
     or p_recipient_account_number !~ '^[0-9]{4,17}$' then
    raise exception 'Enter a fictional account number with 4 to 17 digits';
  end if;
  recipient_account_last4 := right(p_recipient_account_number, 4);

  select * into sender_account
  from public.bank_accounts
  where id = p_sender_account_id
    and user_id = current_user_id
    and is_demo
  for update;
  if not found then
    raise exception 'Choose one of your simulated accounts';
  end if;
  if sender_account.current_balance < transfer_amount then
    raise exception 'The selected account does not have enough simulated funds';
  end if;

  insert into public.demo_transfers (
    user_id,
    sender_account_id,
    receiver_account_id,
    amount,
    memo,
    transfer_type,
    recipient_name,
    recipient_institution,
    recipient_account_last4
  ) values (
    current_user_id,
    sender_account.id,
    null,
    transfer_amount,
    transfer_memo,
    p_transfer_type,
    recipient_name_text,
    recipient_institution_text,
    recipient_account_last4
  ) returning id into transfer_id;

  insert into public.transactions (
    user_id,
    account_id,
    transfer_id,
    name,
    amount,
    direction,
    category,
    payment_channel,
    pending,
    status
  ) values (
    current_user_id,
    sender_account.id,
    transfer_id,
    coalesce(nullif(transfer_memo, ''), 'Transfer to ' || recipient_name_text),
    transfer_amount,
    'debit',
    'Transfer',
    'simulated_external_' || p_transfer_type,
    true,
    'pending'
  );

  return transfer_id;
end;
$$;

revoke all on function public.simulate_external_transfer(uuid, numeric, text, text, text, text, text) from public;
grant execute on function public.simulate_external_transfer(uuid, numeric, text, text, text, text, text) to authenticated;

create function public.admin_update_external_simulated_transaction(
  p_transaction_id uuid,
  p_status text,
  p_customer_notice text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_id uuid := auth.uid();
  target_transaction public.transactions%rowtype;
  target_transfer public.demo_transfers%rowtype;
  sender_account public.bank_accounts%rowtype;
  next_balance numeric(12, 2);
  transaction_count integer;
  notice_text text := left(trim(coalesce(p_customer_notice, '')), 500);
begin
  if admin_id is null or not public.is_demo_admin() then
    raise exception 'Administrator access is required';
  end if;
  if p_status is null or p_status not in (
    'pending', 'successful', 'on_hold', 'action_required', 'failed'
  ) then
    raise exception 'Choose a valid transaction status';
  end if;

  select * into target_transaction
  from public.transactions
  where id = p_transaction_id
  for update;
  if not found or target_transaction.transfer_id is null
     or target_transaction.payment_channel not like 'simulated_external_%' then
    raise exception 'External transfer not found';
  end if;

  select * into target_transfer
  from public.demo_transfers
  where id = target_transaction.transfer_id
  for update;
  if not found or target_transfer.user_id <> target_transaction.user_id
     or target_transfer.receiver_account_id is not null
     or target_transfer.recipient_account_last4 is null
     or target_transfer.amount <> target_transaction.amount
     or target_transaction.payment_channel <>
       ('simulated_external_' || target_transfer.transfer_type) then
    raise exception 'External transfer details are invalid';
  end if;

  select count(*) into transaction_count
  from public.transactions
  where transfer_id = target_transaction.transfer_id;
  if transaction_count <> 1 or target_transaction.direction <> 'debit' then
    raise exception 'The external transfer ledger is inconsistent; status was not changed';
  end if;

  select * into sender_account
  from public.bank_accounts
  where id = target_transaction.account_id
    and user_id = target_transaction.user_id
    and is_demo
  for update;
  if not found then
    raise exception 'The sending account could not be found';
  end if;

  if target_transaction.status <> 'successful' and p_status = 'successful' then
    next_balance := sender_account.current_balance - target_transaction.amount;
    if next_balance < 0 then
      raise exception 'The sending account no longer has enough simulated funds';
    end if;
    update public.bank_accounts
    set current_balance = next_balance,
        available_balance = next_balance
    where id = sender_account.id;
  elsif target_transaction.status = 'successful' and p_status <> 'successful' then
    next_balance := sender_account.current_balance + target_transaction.amount;
    if next_balance > 99999999.99 then
      raise exception 'Reversing this transfer would exceed the sending account balance range';
    end if;
    update public.bank_accounts
    set current_balance = next_balance,
        available_balance = next_balance
    where id = sender_account.id;
  end if;

  update public.transactions
  set status = p_status,
      pending = p_status = 'pending',
      customer_notice = notice_text,
      status_updated_at = now()
  where id = target_transaction.id;

  insert into public.admin_audit_log (
    admin_user_id, target_user_id, account_id, action, details
  ) values (
    admin_id, target_transaction.user_id, target_transaction.account_id,
    'transaction_status_updated',
    jsonb_build_object(
      'transaction_id', target_transaction.id,
      'transfer_id', target_transaction.transfer_id,
      'previous_status', target_transaction.status,
      'status', p_status,
      'customer_notice', notice_text,
      'recipient_institution', target_transfer.recipient_institution,
      'recipient_account_last4', target_transfer.recipient_account_last4
    )
  );

  return target_transaction.id;
end;
$$;

revoke all on function public.admin_update_external_simulated_transaction(uuid, text, text) from public;
grant execute on function public.admin_update_external_simulated_transaction(uuid, text, text) to authenticated;
