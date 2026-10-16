"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type BankAccountRow = {
  id: string;
  name: string;
  official_name: string;
  current_balance: number;
  available_balance: number;
  mask: string;
  type: string;
  subtype: string;
  institution_id: string;
};

function toAccount(row: BankAccountRow): Account {
  return {
    id: row.id,
    availableBalance: Number(row.available_balance),
    currentBalance: Number(row.current_balance),
    officialName: row.official_name,
    mask: row.mask,
    institutionId: row.institution_id,
    name: row.name,
    type: row.type,
    subtype: row.subtype,
  };
}

export async function getAccounts({ userId }: getAccountsProps) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bank_accounts")
    .select(
      "id, name, official_name, current_balance, available_balance, mask, type, subtype, institution_id"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Could not load bank accounts: ${error.message}`);

  const accounts = (data ?? []).map((row) =>
    toAccount(row as BankAccountRow)
  );

  return {
    data: accounts,
    totalBanks: accounts.length,
    totalCurrentBalance: accounts.reduce(
      (total, account) => total + account.currentBalance,
      0
    ),
  };
}

export async function getAccount({ accountId }: getAccountProps) {
  if (!accountId) return null;

  const supabase = createSupabaseServerClient();
  const { data: row, error } = await supabase
    .from("bank_accounts")
    .select(
      "id, name, official_name, current_balance, available_balance, mask, type, subtype, institution_id"
    )
    .eq("id", accountId)
    .maybeSingle();

  if (error) throw new Error(`Could not load the bank account: ${error.message}`);
  if (!row) return null;

  const { data: transactions, error: transactionsError } = await supabase
    .from("transactions")
    .select(
      "id, name, amount, direction, category, payment_channel, pending, date, account_id"
    )
    .eq("account_id", accountId)
    .order("date", { ascending: false });

  if (transactionsError) {
    throw new Error(
      `Could not load account transactions: ${transactionsError.message}`
    );
  }

  return {
    data: toAccount(row as BankAccountRow),
    transactions: (transactions ?? []).map((transaction) => ({
      id: transaction.id,
      name: transaction.name,
      amount: Number(transaction.amount),
      type: transaction.direction,
      category: transaction.category,
      paymentChannel: transaction.payment_channel,
      pending: transaction.pending,
      date: transaction.date,
      accountId: transaction.account_id,
    })),
  };
}
