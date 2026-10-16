create or replace function public.seed_demo_banking_data()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  checking_id uuid;
  savings_id uuid;
  travel_id uuid;
  checking_balance numeric(12, 2) := round((2500 + random() * 5500)::numeric, 2);
  savings_balance numeric(12, 2) := round((7500 + random() * 20000)::numeric, 2);
  travel_balance numeric(12, 2) := round((750 + random() * 4250)::numeric, 2);
  checking_mask text := lpad(floor(random() * 10000)::text, 4, '0');
  savings_mask text;
  travel_mask text;
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', '')
  );

  loop
    savings_mask := lpad(floor(random() * 10000)::text, 4, '0');
    exit when savings_mask <> checking_mask;
  end loop;
  loop
    travel_mask := lpad(floor(random() * 10000)::text, 4, '0');
    exit when travel_mask <> checking_mask and travel_mask <> savings_mask;
  end loop;

  insert into public.bank_accounts (
    user_id, name, official_name, current_balance, available_balance, mask, subtype
  ) values (
    new.id, 'Everyday Checking', 'First Grade Everyday Checking',
    checking_balance, checking_balance, checking_mask, 'checking'
  ) returning id into checking_id;

  insert into public.bank_accounts (
    user_id, name, official_name, current_balance, available_balance, mask, subtype
  ) values (
    new.id, 'Rainy Day Savings', 'First Grade High-Yield Savings',
    savings_balance, savings_balance, savings_mask, 'savings'
  ) returning id into savings_id;

  insert into public.bank_accounts (
    user_id, name, official_name, current_balance, available_balance, mask, subtype
  ) values (
    new.id, 'Travel Account', 'First Grade Travel Checking',
    travel_balance, travel_balance, travel_mask, 'checking'
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
    ) <> 1 or (
      select count(distinct status) from public.transactions
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
    if sender_account.id is null or receiver_account.id is null then
      raise exception 'The simulated transfer accounts could not be found';
    end if;
    if sender_account.id = receiver_account.id
       or sender_account.user_id <> target_transaction.user_id
       or receiver_account.user_id <> target_transaction.user_id
       or not sender_account.is_demo or not receiver_account.is_demo then
      raise exception 'The simulated transfer accounts are invalid';
    end if;

    if target_transaction.status <> 'successful' and p_status = 'successful' then
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
    elsif target_transaction.status = 'successful' and p_status <> 'successful' then
      next_sender_balance := sender_account.current_balance + target_transaction.amount;
      next_receiver_balance := receiver_account.current_balance - target_transaction.amount;
      if next_receiver_balance < 0 then
        raise exception 'The successful transfer cannot be reversed because the receiving account has spent those simulated funds';
      end if;
      if next_sender_balance > 99999999.99 then
        raise exception 'Reversing this transfer would exceed the sending account balance range';
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

    if target_transaction.status <> 'successful' and p_status = 'successful' then
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
    elsif target_transaction.status = 'successful' and p_status <> 'successful' then
      next_sender_balance := case
        when target_transaction.direction = 'credit'
          then sender_account.current_balance - target_transaction.amount
        else sender_account.current_balance + target_transaction.amount
      end;
      if next_sender_balance < 0 or next_sender_balance > 99999999.99 then
        raise exception 'The successful transaction cannot be reversed without exceeding the account balance range';
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
