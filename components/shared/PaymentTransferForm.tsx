"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { simulateDemoTransfer } from "@/lib/actions/transaction.action";
import { formatAmount } from "@/lib/utils";
import { Button } from "../ui/button";

const PaymentTransferForm = ({ accounts }: PaymentTransferFormProps) => {
  const router = useRouter();
  const [senderAccountId, setSenderAccountId] = useState(accounts[0]?.id ?? "");
  const [receiverAccountId, setReceiverAccountId] = useState(
    accounts[1]?.id ?? ""
  );
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    setIsLoading(true);
    try {
      await simulateDemoTransfer({
        senderAccountId,
        receiverAccountId,
        amount: parsedAmount,
        memo,
      });
      setAmount("");
      setMemo("");
      setSuccess("Demo transfer complete. Your balances and activity were updated.");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "The demo transfer could not be completed."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (accounts.length < 2) {
    return (
      <p className="rounded-lg border border-gray-200 bg-white p-5 text-14 text-gray-700">
        Add at least two demo accounts before making an internal transfer.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <p className="rounded-lg border border-blue-100 bg-blue-25 p-4 text-14 text-blue-900">
        Demo mode: transfers only move simulated balances between your demo
        accounts. No real bank or money movement is connected.
      </p>

      <label className="flex flex-col gap-2 text-14 font-medium text-gray-700">
        From account
        <select
          className="input-class bg-white"
          value={senderAccountId}
          onChange={(event) => setSenderAccountId(event.target.value)}
          required
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} · {formatAmount(account.currentBalance)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2 text-14 font-medium text-gray-700">
        To account
        <select
          className="input-class bg-white"
          value={receiverAccountId}
          onChange={(event) => setReceiverAccountId(event.target.value)}
          required
        >
          {accounts.map((account) => (
            <option
              key={account.id}
              value={account.id}
              disabled={account.id === senderAccountId}
            >
              {account.name} · {formatAmount(account.currentBalance)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2 text-14 font-medium text-gray-700">
        Amount (USD)
        <input
          className="input-class"
          type="number"
          min="0.01"
          max="10000"
          step="0.01"
          inputMode="decimal"
          placeholder="25.00"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />
      </label>

      <label className="flex flex-col gap-2 text-14 font-medium text-gray-700">
        Note (optional)
        <input
          className="input-class"
          type="text"
          maxLength={120}
          placeholder="What is this transfer for?"
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
        />
      </label>

      {error && (
        <p className="text-14 text-red-600" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-14 text-success-700" role="status">
          {success}
        </p>
      )}

      <Button type="submit" className="payment-transfer_btn" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 size={20} className="animate-spin" /> &nbsp; Processing...
          </>
        ) : (
          "Simulate Transfer"
        )}
      </Button>
    </form>
  );
};

export default PaymentTransferForm;
