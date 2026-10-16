"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatTransactionEmail, sendTransactionalEmail } from "@/lib/email";

type DemoTransferInput = {
  senderAccountId: string;
  receiverAccountId: string;
  amount: number;
  memo?: string;
  transferType:
    | "internal"
    | "ach"
    | "same_day_ach"
    | "wire"
    | "rtp"
    | "fednow"
    | "p2p";
};

export async function simulateDemoTransfer({
  senderAccountId,
  receiverAccountId,
  amount,
  memo = "",
  transferType,
}: DemoTransferInput) {
  if (!Number.isFinite(amount) || amount < 0.01 || amount > 10000) {
    throw new Error("Transfer amount must be between $0.01 and $10,000.");
  }
  if (Math.round(amount * 100) !== amount * 100) {
    throw new Error("Transfer amount can have at most two decimal places.");
  }
  if (senderAccountId === receiverAccountId) {
    throw new Error("Choose two different accounts.");
  }
  if (
    ![
      "internal",
      "ach",
      "same_day_ach",
      "wire",
      "rtp",
      "fednow",
      "p2p",
    ].includes(transferType)
  ) {
    throw new Error("Choose a supported simulated transfer type.");
  }

  const supabase = createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(`Could not verify your session: ${authError.message}`);
  if (!authData.user?.email) throw new Error("A verified account email is required.");

  const { data, error } = await supabase.rpc("simulate_demo_transfer", {
    p_sender_account_id: senderAccountId,
    p_receiver_account_id: receiverAccountId,
    p_amount: amount,
    p_memo: memo,
    p_transfer_type: transferType,
  });

  if (error) throw new Error(`Simulated transfer failed: ${error.message}`);
  if (!data) throw new Error("The simulated transfer did not return a receipt.");

  const email = await sendTransactionalEmail({
    to: authData.user.email,
    subject: "Your First Grade Finance transfer is pending",
    text: formatTransactionEmail({
      name: memo.trim() || "Simulated transfer",
      amount,
      direction: "debit",
      status: "pending",
      notice:
        "Your simulated transfer request is awaiting review. This does not represent a real payment.",
      reference: data,
      transferType: transferType.toUpperCase(),
    }),
  });

  revalidatePath("/", "layout");
  return { transferId: data, email };
}

export async function getSimulatedTransferStatus(transferId: string) {
  if (!transferId) throw new Error("A transfer reference is required.");
  const supabase = createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    throw new Error(`Could not verify your session: ${authError.message}`);
  }
  if (!authData.user) throw new Error("Sign in to view this transfer.");

  const { data, error } = await supabase
    .from("transactions")
    .select("status, customer_notice, payment_channel")
    .eq("transfer_id", transferId)
    .eq("user_id", authData.user.id);

  if (error) throw new Error(`Could not refresh transfer status: ${error.message}`);
  if (!data?.length) throw new Error("This transfer could not be found.");
  if (data.some((transaction) => transaction.status !== data[0].status)) {
    throw new Error("Transfer records have inconsistent statuses.");
  }

  return {
    status: data[0].status,
    customerNotice: data[0].customer_notice,
    transferType: data[0].payment_channel,
  };
}
