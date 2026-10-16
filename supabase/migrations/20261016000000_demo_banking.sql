create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  first_name text not null default '',
  last_name text not null default '',
  created_at timestamptz not null default now()
);

create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  official_name text not null,
  current_balance numeric(12, 2) not null default 0,
  available_balance numeric(12, 2) not null default 0,
  mask text not null,
  type text not null default 'depository',
  subtype text not null default 'checking',
  institution_id text not null default 'first-grade-finance-prototype',
  created_at timestamptz not null default now()
);

create table public.demo_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  sender_account_id uuid not null references public.bank_accounts (id),
  receiver_account_id uuid not null references public.bank_accounts (id),
  amount numeric(12, 2) not null check (amount > 0),
  memo text not null default '',
  created_at timestamptz not null default now(),
  check (sender_account_id <> receiver_account_id)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  account_id uuid not null references public.bank_accounts (id) on delete cascade,
  transfer_id uuid references public.demo_transfers (id) on delete set null,
  name text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  direction text not null check (direction in ('debit', 'credit')),
  category text not null default 'Transfer',
  payment_channel text not null default 'demo',
  pending boolean not null default false,
  date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index bank_accounts_user_id_idx on public.bank_accounts (user_id);
create index transactions_account_date_idx on public.transactions (account_id, date desc);
create index transactions_user_date_idx on public.transactions (user_id, date desc);

alter table public.profiles enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.demo_transfers enable row level security;
alter table public.transactions enable row level security;

grant select, update on public.profiles to authenticated;
grant select on public.bank_accounts, public.demo_transfers, public.transactions to authenticated;

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Users can read their own bank accounts"
  on public.bank_accounts for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can read their own transfers"
  on public.demo_transfers for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can read their own transactions"
  on public.transactions for select
  to authenticated
  using (user_id = (select auth.uid()));

create function public.seed_demo_banking_data()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  checking_id uuid;
  savings_id uuid;
  travel_id uuid;
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', '')
  );

  insert into public.bank_accounts (
    user_id, name, official_name, current_balance, available_balance, mask, subtype
  ) values (
    new.id, 'Everyday Checking', 'First Grade Everyday Checking',
    4280.50, 4280.50, '4821', 'checking'
  ) returning id into checking_id;

  insert into public.bank_accounts (
    user_id, name, official_name, current_balance, available_balance, mask, subtype
  ) values (
    new.id, 'Rainy Day Savings', 'First Grade High-Yield Savings',
    12150.00, 12150.00, '1907', 'savings'
  ) returning id into savings_id;

  insert into public.bank_accounts (
    user_id, name, official_name, current_balance, available_balance, mask, subtype
  ) values (
    new.id, 'Travel Account', 'First Grade Travel Checking',
    1735.20, 1735.20, '6634', 'checking'
  ) returning id into travel_id;

  insert into public.transactions (
    user_id, account_id, name, amount, direction, category, payment_channel, date
  ) values
    (new.id, checking_id, 'Northstar Market', 68.42, 'debit', 'Food and Drink', 'card', now() - interval '1 day'),
    (new.id, checking_id, 'Monthly salary', 2450.00, 'credit', 'Income', 'direct deposit', now() - interval '2 days'),
    (new.id, checking_id, 'City Power & Light', 94.16, 'debit', 'Utilities', 'online', now() - interval '4 days'),
    (new.id, savings_id, 'Automatic savings deposit', 250.00, 'credit', 'Savings', 'internal transfer', now() - interval '2 days'),
    (new.id, savings_id, 'Interest payment', 8.36, 'credit', 'Interest', 'interest', now() - interval '5 days'),
    (new.id, travel_id, 'Metro Transit', 24.00, 'debit', 'Travel', 'card', now() - interval '3 days');

  return new;
end;
$$;

create trigger on_auth_user_created_seed_demo_data
  after insert on auth.users
  for each row execute procedure public.seed_demo_banking_data();

create function public.simulate_demo_transfer(
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
    raise exception 'You must be signed in to make a simulated transfer';
  end if;

  if p_amount is null or transfer_amount < 0.01 or transfer_amount > 10000 then
    raise exception 'Enter a transfer amount greater than zero and no more than $10,000';
  end if;

  if p_sender_account_id = p_receiver_account_id then
    raise exception 'Choose two different accounts';
  end if;

  perform id
  from public.bank_accounts
  where id in (p_sender_account_id, p_receiver_account_id)
    and user_id = current_user_id
  order by id
  for update;

  select current_balance into sender_balance
  from public.bank_accounts
  where id = p_sender_account_id and user_id = current_user_id;

  select current_balance into receiver_balance
  from public.bank_accounts
  where id = p_receiver_account_id and user_id = current_user_id;

  if sender_balance is null or receiver_balance is null then
    raise exception 'Choose two of your simulated accounts';
  end if;

  if sender_balance < transfer_amount then
    raise exception 'The selected account does not have enough simulated funds';
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
    user_id, account_id, transfer_id, name, amount, direction, category, payment_channel
  ) values
    (current_user_id, p_sender_account_id, transfer_id,
      coalesce(nullif(transfer_memo, ''), 'Internal transfer sent'),
      transfer_amount, 'debit', 'Transfer', 'demo'),
    (current_user_id, p_receiver_account_id, transfer_id,
      coalesce(nullif(transfer_memo, ''), 'Internal transfer received'),
      transfer_amount, 'credit', 'Transfer', 'demo');

  return transfer_id;
end;
$$;

revoke all on function public.simulate_demo_transfer(uuid, uuid, numeric, text) from public;
grant execute on function public.simulate_demo_transfer(uuid, uuid, numeric, text) to authenticated;
