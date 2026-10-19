create or replace function public.seed_demo_banking_data()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
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
  ) values
    (new.id, 'Everyday Checking', 'First Grade Everyday Checking', 0, 0, checking_mask, 'checking'),
    (new.id, 'Rainy Day Savings', 'First Grade High-Yield Savings', 0, 0, savings_mask, 'savings'),
    (new.id, 'Travel Account', 'First Grade Travel Checking', 0, 0, travel_mask, 'checking');

  return new;
end;
$$;
