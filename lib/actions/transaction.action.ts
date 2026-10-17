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
  recipient?: {
    name: string;
    institution: string;
    accountNumber: string;
  };
};

export async function simulateDemoTransfer({
  senderAccountId,
  receiverAccountId,
  amount,
  memo = "",
  transferType,
  recipient,
}: DemoTransferInput) {
  if (!Number.isFinite(amount) || amount < 0.01 || amount > 10000) {
    throw new Error("Transfer amount must be between $0.01 and $10,000.");
  }
  if (Math.round(amount * 100) !== amount * 100) {
    throw new Error("Transfer amount can have at most two decimal places.");
  }
  if (!recipient && senderAccountId === receiverAccountId) {
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
    throw new Error("Choose a supported transfer type.");
  }

  const supabase = createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(`Could not verify your session: ${authError.message}`);
  if (!authData.user?.email) throw new Error("A verified account email is required.");

  if (recipient) {
    if (transferType === "internal") {
      throw new Error("Choose an external transfer method.");
    }
    if (
      recipient.name.trim().length < 2 ||
      recipient.name.trim().length > 80 ||
      recipient.institution.trim().length < 2 ||
      recipient.institution.trim().length > 80
    ) {
      throw new Error("Enter a recipient name and institution (2–80 characters).");
    }
    if (!/^\d{4,17}$/.test(recipient.accountNumber)) {
      throw new Error("Use an account number with 4 to 17 digits.");
    }
  }

  const { data, error } = recipient
    ? await supabase.rpc("simulate_external_transfer", {
        p_sender_account_id: senderAccountId,
        p_amount: amount,
        p_memo: memo,
        p_transfer_type: transferType,
        p_recipient_name: recipient.name.trim(),
        p_recipient_institution: recipient.institution.trim(),
        p_recipient_account_number: recipient.accountNumber,
      })
    : await supabase.rpc("simulate_demo_transfer", {
        p_sender_account_id: senderAccountId,
        p_receiver_account_id: receiverAccountId,
        p_amount: amount,
        p_memo: memo,
        p_transfer_type: transferType,
      });

  if (error) throw new Error(`Transfer failed: ${error.message}`);
  if (!data) throw new Error("The transfer did not return a receipt.");

  const email = await sendTransactionalEmail({
    to: authData.user.email,
    subject: "Your Meridian Finance transfer request is pending",
    text: formatTransactionEmail({
      name: memo.trim() || "Transfer request",
      amount,
      direction: "debit",
      status: "pending",
      notice:
        "Your transfer request is awaiting an administrator status update.",
      reference: data,
      transferType: transferType.toUpperCase(),
    }),
  });

  revalidatePath("/", "layout");
  return {
    transferId: data,
    email,
    recipient: recipient
      ? {
          name: recipient.name.trim(),
          institution: recipient.institution.trim(),
          accountLast4: recipient.accountNumber.slice(-4),
        }
      : undefined,
  };
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
    .select("status, customer_notice, payment_channel, transfer_id")
    .eq("transfer_id", transferId)
    .eq("user_id", authData.user.id);

  if (error) throw new Error(`Could not refresh transfer status: ${error.message}`);
  if (!data?.length) throw new Error("This transfer could not be found.");
  if (data.some((transaction) => transaction.status !== data[0].status)) {
    throw new Error("Transfer records have inconsistent statuses.");
  }

  let recipient:
    | { name: string; institution: string; accountLast4: string }
    | undefined;
  if (data[0].transfer_id) {
    const { data: transfer, error: transferError } = await supabase
      .from("demo_transfers")
      .select(
        "recipient_name, recipient_institution, recipient_account_last4"
      )
      .eq("id", data[0].transfer_id)
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (transferError) {
      throw new Error(
        `Could not load transfer recipient details: ${transferError.message}`
      );
    }
    if (
      transfer?.recipient_name &&
      transfer.recipient_institution &&
      transfer.recipient_account_last4
    ) {
      recipient = {
        name: transfer.recipient_name,
        institution: transfer.recipient_institution,
        accountLast4: transfer.recipient_account_last4,
      };
    }
  }

  return {
    status: data[0].status,
    customerNotice: data[0].customer_notice,
    transferType: data[0].payment_channel,
    recipient,
  };
}
