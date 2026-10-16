"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type DemoTransferInput = {
  senderAccountId: string;
  receiverAccountId: string;
  amount: number;
  memo?: string;
};

export async function simulateDemoTransfer({
  senderAccountId,
  receiverAccountId,
  amount,
  memo = "",
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

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("simulate_demo_transfer", {
    p_sender_account_id: senderAccountId,
    p_receiver_account_id: receiverAccountId,
    p_amount: amount,
    p_memo: memo,
  });

  if (error) throw new Error(`Demo transfer failed: ${error.message}`);
  if (!data) throw new Error("The demo transfer did not return a receipt.");

  revalidatePath("/", "layout");
  return { transferId: data };
}
