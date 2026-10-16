update public.bank_accounts
set account_number = 'FGF' || substr(account_number, 5),
    official_name = replace(official_name, 'Delan', 'First Grade'),
    institution_id = 'first-grade-finance-prototype'
where account_number like 'DEMO%'
   or official_name like '%Delan%'
   or institution_id = 'delan-demo-bank';

alter table public.transactions
  add column status text not null default 'successful'
    check (status in ('pending', 'successful', 'on_hold', 'action_required', 'failed')),
  add column customer_notice text not null default ''
    check (char_length(customer_notice) <= 500),
  add column status_updated_at timestamptz not null default now();

update public.transactions
set status = case when pending then 'pending' else 'successful' end;

create index transactions_user_status_date_idx
  on public.transactions (user_id, status, date desc);

create function public.admin_create_simulated_transaction(
  p_account_id uuid,
  p_name text,
  p_amount numeric,
  p_direction text,
  p_category text,
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
  target_account public.bank_accounts%rowtype;
  transaction_amount numeric(12, 2) := round(p_amount, 2);
  next_balance numeric(12, 2);
  transaction_id uuid;
  transaction_name text := left(trim(coalesce(p_name, '')), 120);
  transaction_category text := left(trim(coalesce(p_category, '')), 40);
  notice_text text := left(trim(coalesce(p_customer_notice, '')), 500);
begin
  if admin_id is null or not public.is_demo_admin() then
    raise exception 'Administrator access is required';
  end if;
  if p_amount is null or p_amount::text = 'NaN'
     or p_amount < 0.01 or p_amount > 1000000
     or p_amount <> transaction_amount then
    raise exception 'Enter a transaction amount from $0.01 to $1,000,000 with at most two decimal places';
  end if;
  if p_direction is null or p_direction not in ('debit', 'credit') then
    raise exception 'Choose debit or credit';
  end if;
  if p_status is null or p_status not in ('pending', 'successful', 'on_hold', 'action_required', 'failed') then
    raise exception 'Choose a valid transaction status';
  end if;
  if transaction_name = '' or transaction_category = '' then
    raise exception 'Transaction name and category are required';
  end if;

  select * into target_account
  from public.bank_accounts
  where id = p_account_id and is_demo
  for update;
  if not found then
    raise exception 'Simulated account not found';
  end if;

  if p_status = 'successful' then
    next_balance := case
      when p_direction = 'credit' then target_account.current_balance + transaction_amount
      else target_account.current_balance - transaction_amount
    end;
    if next_balance < 0 or next_balance > 99999999.99 then
      raise exception 'The transaction would put the account outside its supported balance range';
    end if;

    update public.bank_accounts
    set current_balance = next_balance,
        available_balance = next_balance
    where id = p_account_id;
  end if;

  insert into public.transactions (
    user_id, account_id, name, amount, direction,
    category, payment_channel, pending, status, customer_notice
  ) values (
    target_account.user_id, target_account.id, transaction_name,
    transaction_amount, p_direction, transaction_category, 'admin',
    p_status = 'pending', p_status, notice_text
  ) returning id into transaction_id;

  insert into public.admin_audit_log (
    admin_user_id, target_user_id, account_id, action, details
  ) values (
    admin_id, target_account.user_id, target_account.id,
    'transaction_recorded',
    jsonb_build_object(
      'transaction_id', transaction_id,
      'amount', transaction_amount,
      'direction', p_direction,
      'category', transaction_category,
      'name', transaction_name,
      'status', p_status,
      'customer_notice', notice_text
    )
  );

  return transaction_id;
end;
$$;

revoke all on function public.admin_create_simulated_transaction(uuid, text, numeric, text, text, text, text) from public;
grant execute on function public.admin_create_simulated_transaction(uuid, text, numeric, text, text, text, text) to authenticated;

create function public.admin_update_simulated_transaction(
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
  target_account public.bank_accounts%rowtype;
  next_balance numeric(12, 2);
  notice_text text := left(trim(coalesce(p_customer_notice, '')), 500);
begin
  if admin_id is null or not public.is_demo_admin() then
    raise exception 'Administrator access is required';
  end if;
  if p_status is null or p_status not in ('pending', 'successful', 'on_hold', 'action_required', 'failed') then
    raise exception 'Choose a valid transaction status';
  end if;

  select * into target_transaction
  from public.transactions
  where id = p_transaction_id
  for update;
  if not found then
    raise exception 'Transaction not found';
  end if;

  select * into target_account
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
    next_balance := case
      when target_transaction.direction = 'credit'
        then target_account.current_balance + target_transaction.amount
      else target_account.current_balance - target_transaction.amount
    end;
    if next_balance < 0 or next_balance > 99999999.99 then
      raise exception 'The transaction would put the account outside its supported balance range';
    end if;

    update public.bank_accounts
    set current_balance = next_balance,
        available_balance = next_balance
    where id = target_account.id;
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
