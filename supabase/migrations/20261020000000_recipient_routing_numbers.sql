alter table public.demo_transfers
  add column recipient_routing_last4 text;

alter table public.demo_transfers
  drop constraint demo_transfers_recipient_details_check,
  add constraint demo_transfers_recipient_details_check check (
    (
      receiver_account_id is not null
      and recipient_name is null
      and recipient_institution is null
      and recipient_account_last4 is null
      and recipient_routing_last4 is null
    )
    or (
      receiver_account_id is null
      and char_length(trim(coalesce(recipient_name, ''))) between 2 and 80
      and char_length(trim(coalesce(recipient_institution, ''))) between 2 and 80
      and recipient_account_last4 is not null
      and recipient_account_last4 ~ '^[0-9]{4}$'
      and (
        recipient_routing_last4 is null
        or recipient_routing_last4 ~ '^[0-9]{4}$'
      )
    )
  );

drop function public.simulate_external_transfer(
  uuid, numeric, text, text, text, text, text
);

create function public.simulate_external_transfer(
  p_sender_account_id uuid,
  p_amount numeric,
  p_memo text,
  p_transfer_type text,
  p_recipient_name text,
  p_recipient_institution text,
  p_recipient_account_number text,
  p_recipient_routing_number text
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
  recipient_routing_last4 text;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to submit a transfer';
  end if;
  if p_amount is null or p_amount::text = 'NaN'
     or p_amount < 0.01 or p_amount > 10000
     or p_amount <> transfer_amount then
    raise exception 'Enter a transfer amount from $0.01 to $10,000 with at most two decimal places';
  end if;
  if p_transfer_type is null or p_transfer_type not in (
    'ach', 'same_day_ach', 'wire', 'rtp', 'fednow', 'p2p'
  ) then
    raise exception 'Choose a supported transfer method';
  end if;
  if char_length(trim(coalesce(p_recipient_name, ''))) not between 2 and 80
     or char_length(trim(coalesce(p_recipient_institution, ''))) not between 2 and 80 then
    raise exception 'Enter the recipient name and institution';
  end if;
  if p_recipient_account_number is null
     or p_recipient_account_number !~ '^[0-9]{4,17}$' then
    raise exception 'Enter an account number with 4 to 17 digits';
  end if;
  if p_recipient_routing_number is null
     or p_recipient_routing_number !~ '^[0-9]{9}$'
     or p_recipient_routing_number = '000000000' then
    raise exception 'Enter a valid 9-digit routing number';
  end if;
  if (
    3 * (
      substring(p_recipient_routing_number, 1, 1)::integer
      + substring(p_recipient_routing_number, 4, 1)::integer
      + substring(p_recipient_routing_number, 7, 1)::integer
    )
    + 7 * (
      substring(p_recipient_routing_number, 2, 1)::integer
      + substring(p_recipient_routing_number, 5, 1)::integer
      + substring(p_recipient_routing_number, 8, 1)::integer
    )
    + substring(p_recipient_routing_number, 3, 1)::integer
    + substring(p_recipient_routing_number, 6, 1)::integer
    + substring(p_recipient_routing_number, 9, 1)::integer
  ) % 10 <> 0 then
    raise exception 'Enter a valid 9-digit routing number';
  end if;

  recipient_account_last4 := right(p_recipient_account_number, 4);
  recipient_routing_last4 := right(p_recipient_routing_number, 4);

  select * into sender_account
  from public.bank_accounts
  where id = p_sender_account_id
    and user_id = current_user_id
    and is_demo
  for update;
  if not found then
    raise exception 'Choose one of your accounts';
  end if;
  if sender_account.current_balance < transfer_amount then
    raise exception 'The selected account does not have enough funds';
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
    recipient_account_last4,
    recipient_routing_last4
  ) values (
    current_user_id,
    sender_account.id,
    null,
    transfer_amount,
    transfer_memo,
    p_transfer_type,
    recipient_name_text,
    recipient_institution_text,
    recipient_account_last4,
    recipient_routing_last4
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

revoke all on function public.simulate_external_transfer(
  uuid, numeric, text, text, text, text, text, text
) from public;
grant execute on function public.simulate_external_transfer(
  uuid, numeric, text, text, text, text, text, text
) to authenticated;
