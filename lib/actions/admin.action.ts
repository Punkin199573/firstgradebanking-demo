"use server";

import { revalidatePath } from "next/cache";
import { getLoggedInUser } from "@/lib/actions/user.action";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatTransactionEmail, sendTransactionalEmail } from "@/lib/email";

const transactionStatuses = [
  "pending",
  "successful",
  "on_hold",
  "action_required",
  "failed",
] as const;

type TransactionStatus = (typeof transactionStatuses)[number];

async function notifyTransaction(transactionId: string) {
  const supabase = createSupabaseServerClient();
  const { data: transaction, error: transactionError } = await supabase
    .from("transactions")
    .select(
      "id, user_id, name, amount, direction, status, customer_notice, payment_channel"
    )
    .eq("id", transactionId)
    .single();
  if (transactionError || !transaction) {
    return {
      sent: false,
      reason: `Transaction saved, but notification details could not be loaded${transactionError ? `: ${transactionError.message}` : "."}`,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", transaction.user_id)
    .single();
  if (profileError || !profile?.email) {
    return {
      sent: false,
      reason: `Transaction saved, but the customer email address could not be loaded${profileError ? `: ${profileError.message}` : "."}`,
    };
  }

  const transferType = transaction.payment_channel.startsWith("simulated_")
    ? transaction.payment_channel
        .slice("simulated_".length)
        .replaceAll("_", " ")
        .toUpperCase()
    : undefined;
  return sendTransactionalEmail({
    to: profile.email,
    subject: `First Grade Finance prototype activity: ${transaction.status.replaceAll("_", " ")}`,
    text: formatTransactionEmail({
      name: transaction.name,
      amount: Number(transaction.amount),
      direction: transaction.direction,
      status: transaction.status,
      notice: transaction.customer_notice,
      reference: transaction.id,
      transferType,
    }),
  });
}

async function requireAdmin() {
  const user = await getLoggedInUser();
  if (!user || user.role !== "admin") {
    throw new Error("Administrator access is required.");
  }
  return user;
}

export async function getAdminDashboardData() {
  await requireAdmin();
  const supabase = createSupabaseServerClient();

  const [profilesResult, accountsResult, transactionsResult, auditResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, first_name, last_name, role, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("bank_accounts")
        .select(
          "id, user_id, name, official_name, current_balance, available_balance, mask, subtype, account_number, routing_number, is_demo, created_at"
        )
        .order("created_at", { ascending: true }),
      supabase
        .from("transactions")
        .select(
          "id, user_id, account_id, name, amount, direction, category, payment_channel, date, status, customer_notice, status_updated_at"
        )
        .order("date", { ascending: false })
        .limit(1000),
      supabase
        .from("admin_audit_log")
        .select(
          "id, admin_user_id, target_user_id, account_id, action, details, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

  const failures = [
    profilesResult.error && `profiles: ${profilesResult.error.message}`,
    accountsResult.error && `accounts: ${accountsResult.error.message}`,
    transactionsResult.error &&
      `transactions: ${transactionsResult.error.message}`,
    auditResult.error && `audit log: ${auditResult.error.message}`,
  ].filter(Boolean);

  if (failures.length) {
    throw new Error(`Could not load admin dashboard (${failures.join("; ")}).`);
  }

  return {
    users: profilesResult.data ?? [],
    accounts: accountsResult.data ?? [],
    transactions: transactionsResult.data ?? [],
    auditLog: auditResult.data ?? [],
  };
}

export async function adjustDemoAccountBalance(input: {
  accountId: string;
  balance: number;
  note: string;
}) {
  await requireAdmin();
  if (!input.accountId || !Number.isFinite(input.balance)) {
    throw new Error("Select an account and enter a valid balance.");
  }
  if (
    input.balance < 0 ||
    input.balance > 99999999.99 ||
    Math.round(input.balance * 100) !== input.balance * 100
  ) {
    throw new Error("Balance must be between $0.00 and $99,999,999.99.");
  }
  if (!input.note.trim() || input.note.trim().length > 200) {
    throw new Error("Add a reason of up to 200 characters.");
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_adjust_demo_balance", {
    p_account_id: input.accountId,
    p_new_balance: input.balance,
    p_note: input.note.trim(),
  });

  if (error) throw new Error(`Balance adjustment failed: ${error.message}`);
  if (!data) throw new Error("The adjustment did not return an audit receipt.");
  const email = await notifyTransaction(data);
  revalidatePath("/", "layout");
  return { transactionId: data, email };
}

export async function recordDemoTransaction(input: {
  accountId: string;
  name: string;
  amount: number;
  direction: "debit" | "credit";
  category: string;
  status: TransactionStatus;
  customerNotice: string;
}) {
  await requireAdmin();
  if (!input.accountId || !input.name.trim()) {
    throw new Error("Select an account and provide a transaction description.");
  }
  if (
    !Number.isFinite(input.amount) ||
    input.amount < 0.01 ||
    input.amount > 1000000 ||
    Math.round(input.amount * 100) !== input.amount * 100
  ) {
    throw new Error(
      "Transaction amount must be between $0.01 and $1,000,000 with at most two decimal places."
    );
  }
  if (!["debit", "credit"].includes(input.direction)) {
    throw new Error("Choose a valid transaction direction.");
  }
  if (!transactionStatuses.includes(input.status)) {
    throw new Error("Choose a valid transaction status.");
  }
  if (input.customerNotice.trim().length > 500) {
    throw new Error("Customer notice must be 500 characters or fewer.");
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_create_simulated_transaction", {
    p_account_id: input.accountId,
    p_name: input.name.trim(),
    p_amount: input.amount,
    p_direction: input.direction,
    p_category: input.category.trim() || "Other",
    p_status: input.status,
    p_customer_notice: input.customerNotice.trim(),
  });

  if (error) throw new Error(`Transaction creation failed: ${error.message}`);
  if (!data) throw new Error("The transaction did not return a receipt.");
  const email = await notifyTransaction(data);
  revalidatePath("/", "layout");
  return { transactionId: data, email };
}

export async function updateSimulatedTransaction(input: {
  transactionId: string;
  status: TransactionStatus;
  customerNotice: string;
}) {
  await requireAdmin();
  if (!input.transactionId) {
    throw new Error("Select a transaction.");
  }
  if (!transactionStatuses.includes(input.status)) {
    throw new Error("Choose a valid transaction status.");
  }
  if (input.customerNotice.trim().length > 500) {
    throw new Error("Customer notice must be 500 characters or fewer.");
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc(
    "admin_update_simulated_transaction",
    {
      p_transaction_id: input.transactionId,
      p_status: input.status,
      p_customer_notice: input.customerNotice.trim(),
    }
  );

  if (error) throw new Error(`Transaction update failed: ${error.message}`);
  if (!data) throw new Error("The transaction update did not return a receipt.");
  const email = await notifyTransaction(data);
  revalidatePath("/", "layout");
  return { transactionId: data, email };
}
