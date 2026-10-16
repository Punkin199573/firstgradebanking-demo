"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownUp, CheckCircle2, Loader2, X } from "lucide-react";
import {
  getSimulatedTransferStatus,
  simulateDemoTransfer,
} from "@/lib/actions/transaction.action";
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
  const [transferType, setTransferType] = useState<
    "internal" | "ach" | "same_day_ach" | "wire" | "rtp" | "fednow" | "p2p"
  >("internal");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{
    id: string;
    amount: number;
    transferType: typeof transferType;
    status: Transaction["status"];
    customerNotice: string;
    emailSent: boolean;
    emailReason?: string;
  } | null>(null);
  const [statusError, setStatusError] = useState("");
  const [checkingStatus, setCheckingStatus] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const receiptId = receipt?.id;
  const receiptStatus = receipt?.status;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await simulateDemoTransfer({
        senderAccountId,
        receiverAccountId,
        amount: parsedAmount,
        memo,
        transferType,
      });
      setAmount("");
      setMemo("");
      setReceipt({
        id: result.transferId,
        amount: parsedAmount,
        transferType,
        status: "pending",
        customerNotice: "",
        emailSent: result.email.sent,
        emailReason: result.email.reason,
      });
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "The simulated transfer could not be completed."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (
      !receiptId ||
      receiptStatus === "successful" ||
      receiptStatus === "failed"
    ) {
      return;
    }

    let active = true;
    const refreshStatus = async () => {
      try {
        const result = await getSimulatedTransferStatus(receiptId);
        if (!active) return;
        setReceipt((current) =>
          current
            ? {
                ...current,
                status: result.status,
                customerNotice: result.customerNotice,
              }
            : current
        );
        setStatusError("");
      } catch (statusCheckError) {
        if (active) {
          setStatusError(
            statusCheckError instanceof Error
              ? statusCheckError.message
              : "Could not refresh transfer status."
          );
        }
      }
    };
    const interval = window.setInterval(refreshStatus, 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [receiptId, receiptStatus]);

  useEffect(() => {
    if (!receiptId) return;
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setReceipt(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [receiptId]);

  if (accounts.length < 2) {
    return (
      <p className="rounded-lg border border-gray-200 bg-white p-5 text-14 text-gray-700">
        Add at least two simulated accounts before making an internal transfer.
      </p>
    );
  }

  return (
    <>
      <form
        onSubmit={submit}
        className="transfer-form-card flex w-full max-w-3xl flex-col gap-5 rounded-3xl border border-gray-200 bg-white p-4 shadow-chart sm:gap-6 sm:p-7"
      >
      <p className="rounded-2xl border border-blue-100 bg-blue-25 p-4 text-14 leading-6 text-blue-900">
        Prototype environment: transfer methods are visual simulations only.
        No ACH, wire, real-time payment, or P2P network is connected, and no
        real funds move.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex min-w-0 flex-col gap-2 text-14 font-medium text-gray-700">
          From account
          <select
            className="input-class"
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

        <label className="flex min-w-0 flex-col gap-2 text-14 font-medium text-gray-700">
          To account
          <select
            className="input-class"
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
      </div>

      <label className="flex flex-col gap-2 text-14 font-medium text-gray-700">
        Transfer method
        <select
          className="input-class"
          value={transferType}
          onChange={(event) =>
            setTransferType(
              event.target.value as typeof transferType
            )
          }
        >
          <option value="internal">Internal account transfer</option>
          <option value="ach">ACH (simulated)</option>
          <option value="same_day_ach">Same-day ACH (simulated)</option>
          <option value="wire">Domestic wire (simulated)</option>
          <option value="rtp">RTP real-time payment (simulated)</option>
          <option value="fednow">FedNow payment (simulated)</option>
          <option value="p2p">Person-to-person (simulated)</option>
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-14 text-red-700" role="alert">
          {error}
        </p>
      )}

      <Button
        type="submit"
        className="payment-transfer_btn"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 size={20} className="animate-spin" /> &nbsp; Submitting...
          </>
        ) : (
          <>
            <ArrowDownUp size={18} /> &nbsp; Submit simulated transfer
          </>
        )}
      </Button>
      </form>

      {receipt && (
        <div className="transfer-dialog-backdrop">
          <section
            className="transfer-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="transfer-dialog-title"
            onKeyDown={(event) => {
              if (event.key !== "Tab") return;
              const focusable = Array.from(
                event.currentTarget.querySelectorAll<HTMLElement>(
                  'button:not(:disabled), a[href]'
                )
              );
              const first = focusable[0];
              const last = focusable[focusable.length - 1];
              if (
                event.shiftKey &&
                first &&
                document.activeElement === first
              ) {
                event.preventDefault();
                last?.focus();
              } else if (
                !event.shiftKey &&
                last &&
                document.activeElement === last
              ) {
                event.preventDefault();
                first?.focus();
              }
            }}
          >
            <button
              ref={closeButtonRef}
              type="button"
              className="transfer-dialog-close"
              aria-label="Close transfer status"
              onClick={() => setReceipt(null)}
            >
              <X size={20} />
            </button>
            <div className="transfer-pending-icon">
              {receipt.status === "successful" ? (
                <CheckCircle2 size={24} />
              ) : receipt.status === "failed" ? (
                <X size={24} />
              ) : (
                <Loader2 size={24} className="animate-spin" />
              )}
            </div>
            <p className="mt-5 text-12 font-semibold uppercase tracking-[0.16em] text-amber-700">
              Transfer update
            </p>
            <h2
              id="transfer-dialog-title"
              className="mt-2 text-24 font-semibold text-gray-900"
            >
              {receipt.status === "action_required"
                ? "Action required"
                : receipt.status === "on_hold"
                  ? "Transfer on hold"
                  : receipt.status === "successful"
                    ? "Transfer successful"
                    : receipt.status === "failed"
                      ? "Transfer failed"
                      : "Transfer pending"}
            </h2>
            <p className="mt-3 text-14 leading-6 text-gray-600">
              {receipt.status === "successful"
                ? "The administrator marked this simulated transfer successful. The simulated account balances have been updated."
                : receipt.status === "failed"
                  ? "The administrator marked this simulated transfer failed. Simulated account balances were not changed."
                  : "This simulated transfer is awaiting an administrator status update. Account balances will not change unless it is marked successful."}
            </p>
            {receipt.customerNotice && (
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-25 p-4">
                <p className="text-10 font-semibold uppercase tracking-wide text-blue-700">
                  Message from First Grade Finance
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words text-14 leading-6 text-blue-900">
                  {receipt.customerNotice}
                </p>
              </div>
            )}
            <div className="mt-5 grid gap-4 rounded-xl bg-gray-25 p-4 sm:grid-cols-2">
              <div>
                <p className="text-10 font-semibold uppercase tracking-wide text-gray-500">
                  Amount
                </p>
                <p className="mt-1 text-14 font-semibold text-gray-900">
                  {formatAmount(receipt.amount)}
                </p>
              </div>
              <div>
                <p className="text-10 font-semibold uppercase tracking-wide text-gray-500">
                  Method · simulated
                </p>
                <p className="mt-1 text-14 font-semibold uppercase text-gray-900">
                  {receipt.transferType.replaceAll("_", " ")}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-10 font-semibold uppercase tracking-wide text-gray-500">
                  Reference
                </p>
                <p className="mt-1 break-all font-mono text-12 text-gray-900">
                  {receipt.id}
                </p>
              </div>
            </div>
            <p
              className={`mt-4 text-12 ${receipt.emailSent ? "text-success-700" : "text-amber-700"}`}
              role="status"
            >
              {receipt.emailSent
                ? "A pending-status email was sent to your account email."
                : `Transfer saved, but email was not sent: ${receipt.emailReason}`}
            </p>
            {statusError && (
              <p className="mt-3 rounded-lg bg-red-50 p-3 text-12 text-red-700" role="alert">
                {statusError}
              </p>
            )}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {receipt.status !== "successful" &&
                receipt.status !== "failed" && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={checkingStatus}
                    onClick={async () => {
                      setCheckingStatus(true);
                      setStatusError("");
                      try {
                        const result = await getSimulatedTransferStatus(
                          receipt.id
                        );
                        setReceipt((current) =>
                          current
                            ? {
                                ...current,
                                status: result.status,
                                customerNotice: result.customerNotice,
                              }
                            : current
                        );
                      } catch (statusCheckError) {
                        setStatusError(
                          statusCheckError instanceof Error
                            ? statusCheckError.message
                            : "Could not refresh transfer status."
                        );
                      } finally {
                        setCheckingStatus(false);
                      }
                    }}
                  >
                    {checkingStatus ? "Checking..." : "Refresh status"}
                  </Button>
                )}
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  setReceipt(null);
                  router.push("/transaction-history");
                }}
              >
                View activity
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setReceipt(null)}
              >
                Close
              </Button>
            </div>
            <p className="mt-4 text-10 leading-4 text-gray-500">
              Prototype only. This does not initiate an ACH, wire, RTP, FedNow,
              or person-to-person network payment.
            </p>
          </section>
        </div>
      )}
    </>
  );
};

export default PaymentTransferForm;
