alter table public.demo_transfers
  add column transfer_type text not null default 'internal'
    check (transfer_type in ('internal', 'ach', 'same_day_ach', 'wire', 'rtp', 'fednow', 'p2p'));

drop function public.simulate_demo_transfer(uuid, uuid, numeric, text);

create function public.simulate_demo_transfer(
  p_sender_account_id uuid,
  p_receiver_account_id uuid,
  p_amount numeric,
  p_memo text default '',
  p_transfer_type text default 'internal'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  sender_balance numeric(12, 2);
  receiver_balance numeric(12, 2);
  transfer_id uuid;
  transfer_amount numeric(12, 2) := round(p_amount, 2);
  transfer_memo text := left(trim(coalesce(p_memo, '')), 120);
begin
  if current_user_id is null then
    raise exception 'You must be signed in to make a simulated transfer';
  end if;
  if p_amount is null or p_amount::text = 'NaN'
     or p_amount < 0.01 or p_amount > 10000
     or p_amount <> transfer_amount then
    raise exception 'Enter a transfer amount from $0.01 to $10,000 with at most two decimal places';
  end if;
  if p_sender_account_id is null or p_receiver_account_id is null
     or p_sender_account_id = p_receiver_account_id then
    raise exception 'Choose two different simulated accounts';
  end if;
  if p_transfer_type is null or p_transfer_type not in (
    'internal', 'ach', 'same_day_ach', 'wire', 'rtp', 'fednow', 'p2p'
  ) then
    raise exception 'Choose a supported simulated transfer type';
  end if;

  perform id
  from public.bank_accounts
  where id in (p_sender_account_id, p_receiver_account_id)
    and user_id = current_user_id
    and is_demo
  order by id
  for update;

  select current_balance into sender_balance
  from public.bank_accounts
  where id = p_sender_account_id
    and user_id = current_user_id
    and is_demo;
  select current_balance into receiver_balance
  from public.bank_accounts
  where id = p_receiver_account_id
    and user_id = current_user_id
    and is_demo;

  if sender_balance is null or receiver_balance is null then
    raise exception 'Choose two of your simulated accounts';
  end if;
  if sender_balance < transfer_amount then
    raise exception 'The selected account does not have enough simulated funds';
  end if;

  insert into public.demo_transfers (
    user_id, sender_account_id, receiver_account_id, amount, memo, transfer_type
  ) values (
    current_user_id, p_sender_account_id, p_receiver_account_id,
    transfer_amount, transfer_memo, p_transfer_type
  ) returning id into transfer_id;

  insert into public.transactions (
    user_id, account_id, transfer_id, name, amount, direction,
    category, payment_channel, pending, status
  ) values
    (current_user_id, p_sender_account_id, transfer_id,
      coalesce(nullif(transfer_memo, ''), 'Internal transfer sent'),
      transfer_amount, 'debit', 'Transfer', 'simulated_' || p_transfer_type,
      true, 'pending'),
    (current_user_id, p_receiver_account_id, transfer_id,
      coalesce(nullif(transfer_memo, ''), 'Internal transfer received'),
      transfer_amount, 'credit', 'Transfer', 'simulated_' || p_transfer_type,
      true, 'pending');

  return transfer_id;
end;
$$;

revoke all on function public.simulate_demo_transfer(uuid, uuid, numeric, text, text) from public;
grant execute on function public.simulate_demo_transfer(uuid, uuid, numeric, text, text) to authenticated;

create or replace function public.admin_update_simulated_transaction(
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
  paired_transactions integer := 1;
  sender_account public.bank_accounts%rowtype;
  receiver_account public.bank_accounts%rowtype;
  next_sender_balance numeric(12, 2);
  next_receiver_balance numeric(12, 2);
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
  where id = p_transaction_id;
  if not found then
    raise exception 'Transaction not found';
  end if;

  if target_transaction.transfer_id is not null then
    perform id
    from public.transactions
    where transfer_id = target_transaction.transfer_id
    order by id
    for update;

    select * into target_transaction
    from public.transactions
    where id = p_transaction_id;

    select count(*) into paired_transactions
    from public.transactions
    where transfer_id = target_transaction.transfer_id;
    if paired_transactions <> 2 then
      raise exception 'The simulated transfer ledger is incomplete; status was not changed';
    end if;
    if (
      select count(*) from public.transactions
      where transfer_id = target_transaction.transfer_id and direction = 'debit'
    ) <> 1 or (
      select count(*) from public.transactions
      where transfer_id = target_transaction.transfer_id and direction = 'credit'
    ) <> 1 or (
      select count(distinct amount) from public.transactions
      where transfer_id = target_transaction.transfer_id
    ) <> 1 or (
      select count(distinct user_id) from public.transactions
      where transfer_id = target_transaction.transfer_id
    ) <> 1 then
      raise exception 'The simulated transfer ledger is inconsistent; status was not changed';
    end if;

    perform id
    from public.bank_accounts
    where id in (
      select account_id
      from public.transactions
      where transfer_id = target_transaction.transfer_id
    )
    order by id
    for update;

    select * into sender_account
    from public.bank_accounts
    where id = (
      select account_id from public.transactions
      where transfer_id = target_transaction.transfer_id and direction = 'debit'
    );
    select * into receiver_account
    from public.bank_accounts
    where id = (
      select account_id from public.transactions
      where transfer_id = target_transaction.transfer_id and direction = 'credit'
    );
    if not found or sender_account.id is null or receiver_account.id is null then
      raise exception 'The simulated transfer accounts could not be found';
    end if;
    if sender_account.user_id <> target_transaction.user_id
       or receiver_account.user_id <> target_transaction.user_id
       or not sender_account.is_demo or not receiver_account.is_demo then
      raise exception 'The simulated transfer accounts are invalid';
    end if;

    if exists (
      select 1 from public.transactions
      where transfer_id = target_transaction.transfer_id
        and status in ('successful', 'failed')
    ) then
      raise exception 'A final transaction status cannot be changed';
    end if;

    if p_status = 'successful' then
      next_sender_balance := sender_account.current_balance - target_transaction.amount;
      next_receiver_balance := receiver_account.current_balance + target_transaction.amount;
      if next_sender_balance < 0 then
        raise exception 'The sending account no longer has enough simulated funds';
      end if;
      if next_receiver_balance > 99999999.99 then
        raise exception 'The receiving account would exceed its supported balance range';
      end if;

      update public.bank_accounts
      set current_balance = next_sender_balance,
          available_balance = next_sender_balance
      where id = sender_account.id;
      update public.bank_accounts
      set current_balance = next_receiver_balance,
          available_balance = next_receiver_balance
      where id = receiver_account.id;
    end if;

    update public.transactions
    set status = p_status,
        pending = p_status = 'pending',
        customer_notice = notice_text,
        status_updated_at = now()
    where transfer_id = target_transaction.transfer_id;
  else
    select * into target_transaction
    from public.transactions
    where id = p_transaction_id
    for update;

    select * into sender_account
    from public.bank_accounts
    where id = target_transaction.account_id and is_demo
    for update;
    if not found then
      raise exception 'Simulated account not found';
    end if;
    if target_transaction.status in ('successful', 'failed') then
      raise exception 'A final transaction status cannot be changed';
    end if;

    if p_status = 'successful' then
      next_sender_balance := case
        when target_transaction.direction = 'credit'
          then sender_account.current_balance + target_transaction.amount
        else sender_account.current_balance - target_transaction.amount
      end;
      if next_sender_balance < 0 or next_sender_balance > 99999999.99 then
        raise exception 'The transaction would put the account outside its supported balance range';
      end if;

      update public.bank_accounts
      set current_balance = next_sender_balance,
          available_balance = next_sender_balance
      where id = sender_account.id;
    end if;

    update public.transactions
    set status = p_status,
        pending = p_status = 'pending',
        customer_notice = notice_text,
        status_updated_at = now()
    where id = target_transaction.id;
  end if;

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
      'customer_notice', notice_text
    )
  );

  return target_transaction.id;
end;
$$;

revoke all on function public.admin_update_simulated_transaction(uuid, text, text) from public;
grant execute on function public.admin_update_simulated_transaction(uuid, text, text) to authenticated;
