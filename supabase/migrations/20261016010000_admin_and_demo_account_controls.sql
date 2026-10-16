alter table public.profiles
  add column role text not null default 'user'
    check (role in ('user', 'admin'));

alter table public.bank_accounts
  add column account_number text not null
    default ('DEMO' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  add column routing_number text not null default '000000000'
    check (routing_number ~ '^[0-9]{9}$'),
  add column is_demo boolean not null default true;

create unique index bank_accounts_account_number_key
  on public.bank_accounts (account_number);

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.profiles (id),
  target_user_id uuid not null references public.profiles (id),
  account_id uuid references public.bank_accounts (id),
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index admin_audit_log_target_created_idx
  on public.admin_audit_log (target_user_id, created_at desc);

alter table public.admin_audit_log enable row level security;
grant select on public.admin_audit_log to authenticated;

create or replace function public.is_demo_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_demo_admin() from public;
grant execute on function public.is_demo_admin() to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users and admins can read profiles"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or public.is_demo_admin());
create policy "Users can update their own name"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
revoke update on public.profiles from authenticated;
grant update (first_name, last_name) on public.profiles to authenticated;

drop policy if exists "Users can read their own bank accounts" on public.bank_accounts;
create policy "Users and admins can read bank accounts"
  on public.bank_accounts for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_demo_admin());
revoke update on public.bank_accounts from authenticated;

drop policy if exists "Users can read their own transfers" on public.demo_transfers;
create policy "Users and admins can read demo transfers"
  on public.demo_transfers for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_demo_admin());

drop policy if exists "Users can read their own transactions" on public.transactions;
create policy "Users and admins can read transactions"
  on public.transactions for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_demo_admin());

create or replace function public.simulate_demo_transfer(
  p_sender_account_id uuid,
  p_receiver_account_id uuid,
  p_amount numeric,
  p_memo text default ''
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
    raise exception 'You must be signed in to make a demo transfer';
  end if;
  if p_amount is null or p_amount::text = 'NaN'
     or p_amount < 0.01 or p_amount > 10000
     or p_amount <> transfer_amount then
    raise exception 'Enter a transfer amount from $0.01 to $10,000 with at most two decimal places';
  end if;
  if p_sender_account_id is null or p_receiver_account_id is null
     or p_sender_account_id = p_receiver_account_id then
    raise exception 'Choose two different demo accounts';
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
    raise exception 'Choose two of your demo accounts';
  end if;
  if sender_balance < transfer_amount then
    raise exception 'The selected account does not have enough demo funds';
  end if;

  update public.bank_accounts
  set current_balance = current_balance - transfer_amount,
      available_balance = available_balance - transfer_amount
  where id = p_sender_account_id;

  update public.bank_accounts
  set current_balance = current_balance + transfer_amount,
      available_balance = available_balance + transfer_amount
  where id = p_receiver_account_id;

  insert into public.demo_transfers (
    user_id, sender_account_id, receiver_account_id, amount, memo
  ) values (
    current_user_id, p_sender_account_id, p_receiver_account_id,
    transfer_amount, transfer_memo
  ) returning id into transfer_id;

  insert into public.transactions (
    user_id, account_id, transfer_id, name, amount, direction,
    category, payment_channel, pending
  ) values
    (current_user_id, p_sender_account_id, transfer_id,
      coalesce(nullif(transfer_memo, ''), 'Demo transfer sent'),
      transfer_amount, 'debit', 'Transfer', 'demo', false),
    (current_user_id, p_receiver_account_id, transfer_id,
      coalesce(nullif(transfer_memo, ''), 'Demo transfer received'),
      transfer_amount, 'credit', 'Transfer', 'demo', false);

  return transfer_id;
end;
$$;

revoke all on function public.simulate_demo_transfer(uuid, uuid, numeric, text) from public;
grant execute on function public.simulate_demo_transfer(uuid, uuid, numeric, text) to authenticated;

create policy "Admins can read audit history"
  on public.admin_audit_log for select
  to authenticated
  using (public.is_demo_admin());

create function public.admin_adjust_demo_balance(
  p_account_id uuid,
  p_new_balance numeric,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_id uuid := auth.uid();
  target_account public.bank_accounts%rowtype;
  old_balance numeric(12, 2);
  new_balance numeric(12, 2) := round(p_new_balance, 2);
  adjustment_id uuid;
  adjustment_amount numeric(12, 2);
  adjustment_direction text;
  note_text text := left(trim(coalesce(p_note, '')), 200);
begin
  if admin_id is null or not public.is_demo_admin() then
    raise exception 'Administrator access is required';
  end if;
  if p_new_balance is null or p_new_balance::text = 'NaN'
     or p_new_balance < 0 or p_new_balance > 99999999.99
     or p_new_balance <> new_balance then
    raise exception 'Enter a balance from $0.00 to $99,999,999.99 with at most two decimal places';
  end if;
  if note_text = '' then
    raise exception 'Add a reason for the balance adjustment';
  end if;

  select * into target_account
  from public.bank_accounts
  where id = p_account_id and is_demo
  for update;
  if not found then
    raise exception 'Demo account not found';
  end if;

  old_balance := target_account.current_balance;
  adjustment_amount := abs(new_balance - old_balance);
  adjustment_direction := case
    when new_balance >= old_balance then 'credit'
    else 'debit'
  end;

  update public.bank_accounts
  set current_balance = new_balance,
      available_balance = new_balance
  where id = p_account_id;

  insert into public.transactions (
    user_id, account_id, name, amount, direction,
    category, payment_channel, pending
  ) values (
    target_account.user_id, target_account.id, 'Admin balance adjustment',
    adjustment_amount, adjustment_direction, 'Adjustment', 'admin', false
  ) returning id into adjustment_id;

  insert into public.admin_audit_log (
    admin_user_id, target_user_id, account_id, action, details
  ) values (
    admin_id, target_account.user_id, target_account.id,
    'balance_adjustment',
    jsonb_build_object(
      'previous_balance', old_balance,
      'new_balance', new_balance,
      'note', note_text,
      'transaction_id', adjustment_id
    )
  );

  return adjustment_id;
end;
$$;

revoke all on function public.admin_adjust_demo_balance(uuid, numeric, text) from public;
grant execute on function public.admin_adjust_demo_balance(uuid, numeric, text) to authenticated;

create function public.admin_record_demo_transaction(
  p_account_id uuid,
  p_name text,
  p_amount numeric,
  p_direction text,
  p_category text default 'Other'
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
  transaction_id uuid;
  next_balance numeric(12, 2);
  transaction_name text := left(trim(coalesce(p_name, '')), 120);
  transaction_category text := left(trim(coalesce(p_category, 'Other')), 40);
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
  if transaction_name = '' or transaction_category = '' then
    raise exception 'Transaction name and category are required';
  end if;

  select * into target_account
  from public.bank_accounts
  where id = p_account_id and is_demo
  for update;
  if not found then
    raise exception 'Demo account not found';
  end if;

  next_balance := case
    when p_direction = 'credit' then target_account.current_balance + transaction_amount
    else target_account.current_balance - transaction_amount
  end;
  if next_balance < 0 or next_balance > 99999999.99 then
    raise exception 'The transaction would put the demo account outside its supported balance range';
  end if;

  update public.bank_accounts
  set current_balance = next_balance,
      available_balance = next_balance
  where id = p_account_id;

  insert into public.transactions (
    user_id, account_id, name, amount, direction,
    category, payment_channel, pending
  ) values (
    target_account.user_id, target_account.id, transaction_name,
    transaction_amount, p_direction, transaction_category, 'admin', false
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
      'name', transaction_name
    )
  );

  return transaction_id;
end;
$$;

revoke all on function public.admin_record_demo_transaction(uuid, text, numeric, text, text) from public;
grant execute on function public.admin_record_demo_transaction(uuid, text, numeric, text, text) to authenticated;
