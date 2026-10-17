"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowDownUp,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Landmark,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  getSimulatedTransferStatus,
  simulateDemoTransfer,
} from "@/lib/actions/transaction.action";
import { formatAmount } from "@/lib/utils";
import { Button } from "../ui/button";

const PaymentTransferForm = ({ accounts }: PaymentTransferFormProps) => {
  const router = useRouter();
  const [destination, setDestination] = useState<"internal" | "external">(
    accounts.length > 1 ? "internal" : "external"
  );
  const [senderAccountId, setSenderAccountId] = useState(accounts[0]?.id ?? "");
  const [receiverAccountId, setReceiverAccountId] = useState(
    accounts[1]?.id ?? ""
  );
  const [recipientName, setRecipientName] = useState("");
  const [recipientInstitution, setRecipientInstitution] = useState("");
  const [recipientAccountNumber, setRecipientAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [transferType, setTransferType] = useState<
    "internal" | "ach" | "same_day_ach" | "wire" | "rtp" | "fednow" | "p2p"
  >(accounts.length > 1 ? "internal" : "ach");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{
    id: string;
    amount: number;
    transferType: typeof transferType;
    status: Transaction["status"];
    customerNotice: string;
    emailSent: boolean;
    emailReason?: string;
    recipient?: {
      name: string;
      institution: string;
      accountLast4: string;
    };
  } | null>(null);
  const [statusError, setStatusError] = useState("");
  const [checkingStatus, setCheckingStatus] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const receiptId = receipt?.id;
  const lastObservedStatus = useRef<{
    status: Transaction["status"];
    notice: string;
  } | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (destination === "internal" && accounts.length < 2) {
      setError("Add another account or choose an external institution.");
      return;
    }

    setIsLoading(true);
    try {
      const externalRecipient =
        destination === "external"
          ? {
              name: recipientName,
              institution: recipientInstitution,
              accountNumber: recipientAccountNumber,
            }
          : undefined;
      const result = await simulateDemoTransfer({
        senderAccountId,
        receiverAccountId,
        amount: parsedAmount,
        memo,
        transferType,
        recipient: externalRecipient,
      });
      setAmount("");
      setMemo("");
      setRecipientName("");
      setRecipientInstitution("");
      setRecipientAccountNumber("");
      lastObservedStatus.current = null;
      setReceipt({
        id: result.transferId,
        amount: parsedAmount,
        transferType,
        status: "pending",
        customerNotice: "",
        emailSent: result.email.sent,
        emailReason: result.email.reason,
        recipient: result.recipient,
      });
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "The pending transfer could not be completed."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!receiptId) return;

    let active = true;
    const refreshStatus = async () => {
      try {
        const result = await getSimulatedTransferStatus(receiptId);
        if (!active) return;
        const previousStatus = lastObservedStatus.current ?? {
          status: "pending",
          notice: "",
        };
        if (
          previousStatus.status !== result.status ||
          previousStatus.notice !== result.customerNotice
        ) {
          router.refresh();
        }
        lastObservedStatus.current = {
          status: result.status,
          notice: result.customerNotice,
        };
        setReceipt((current) =>
          current
            ? {
                ...current,
                status: result.status,
                customerNotice: result.customerNotice,
                recipient: result.recipient,
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
    void refreshStatus();
    const interval = window.setInterval(refreshStatus, 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [receiptId, router]);

  useEffect(() => {
    if (!receiptId) return;
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setReceipt(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [receiptId]);

  if (accounts.length === 0) {
    return (
      <p className="mx-auto max-w-6xl rounded-2xl border border-gray-200 bg-white p-6 text-14 text-gray-700 shadow-sm">
        No accounts are available for a transfer yet.
      </p>
    );
  }

  const selectedAccount = accounts.find(
    (account) => account.id === senderAccountId
  );
  const selectedDestination = accounts.find(
    (account) => account.id === receiverAccountId
  );

  return (
    <>
      <div className="transfer-workspace mx-auto grid w-full max-w-6xl items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-6">
        <form
          onSubmit={submit}
          className="transfer-form-card flex w-full min-w-0 flex-col gap-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-chart sm:p-7"
        >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <p className="text-11 font-semibold uppercase tracking-[0.14em] text-teal-700">
            Transfer details
          </p>
          <h2 className="mt-1 text-20 font-semibold tracking-tight text-gray-900">
            Create a transfer
          </h2>
          <p className="mt-1 text-13 leading-5 text-gray-600">
            Choose where the request should go and review the details.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-11 font-semibold text-amber-700">
          <ShieldCheck size={14} aria-hidden="true" />
          Secure transfer
        </span>
      </div>

      <div className="flex gap-3 rounded-2xl border border-blue-100 bg-blue-25 p-4 text-blue-900">
        <AlertCircle
          className="mt-0.5 shrink-0 text-blue-700"
          size={19}
          aria-hidden="true"
        />
        <p className="text-13 leading-5">
          <span className="font-semibold">Review carefully.</span> Confirm
          recipient details before submitting an external transfer.
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-14 font-semibold text-gray-900">
          Destination
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${
              destination === "internal"
                ? "border-teal-600 bg-teal-50 shadow-sm"
                : "border-gray-200 bg-white hover:border-teal-300 hover:bg-gray-25"
            } ${accounts.length < 2 ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <input
              type="radio"
              name="destination"
              value="internal"
              checked={destination === "internal"}
              disabled={accounts.length < 2}
              onChange={() => {
                setDestination("internal");
                setTransferType("internal");
              }}
              className="mt-1 accent-teal-700"
            />
            <span>
              <span className="block text-14 font-semibold text-gray-900">
                My accounts
              </span>
              <span className="mt-1 block text-12 leading-5 text-gray-600">
                Move funds between accounts you own.
              </span>
            </span>
          </label>
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${
              destination === "external"
                ? "border-teal-600 bg-teal-50 shadow-sm"
                : "border-gray-200 bg-white hover:border-teal-300 hover:bg-gray-25"
            }`}
          >
            <input
              type="radio"
              name="destination"
              value="external"
              checked={destination === "external"}
              onChange={() => {
                setDestination("external");
                if (transferType === "internal") setTransferType("ach");
              }}
              className="mt-1 accent-teal-700"
            />
            <span>
              <span className="block text-14 font-semibold text-gray-900">
                Another institution
              </span>
              <span className="mt-1 block text-12 leading-5 text-gray-600">
                Send a request to another institution for review.
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      <label className="flex min-w-0 flex-col gap-2 text-14 font-medium text-gray-700">
        From account
        <select
          className="input-class"
          value={senderAccountId}
          onChange={(event) => {
            const nextSenderAccountId = event.target.value;
            setSenderAccountId(nextSenderAccountId);
            if (receiverAccountId === nextSenderAccountId) {
              setReceiverAccountId(
                accounts.find((account) => account.id !== nextSenderAccountId)
                  ?.id ?? ""
              );
            }
          }}
          required
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} · {formatAmount(account.currentBalance)}
            </option>
          ))}
        </select>
      </label>

      {destination === "internal" ? (
        accounts.length > 1 ? (
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
        ) : (
          <p className="rounded-xl bg-amber-50 p-3 text-12 text-amber-800">
            An internal transfer needs two accounts. Choose another institution
            above, or add a second account.
          </p>
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-14 font-medium text-gray-700">
            Recipient name
            <input
              className="input-class"
              type="text"
              autoComplete="off"
              maxLength={80}
              minLength={2}
              value={recipientName}
              onChange={(event) => setRecipientName(event.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-14 font-medium text-gray-700">
            Institution name
            <input
              className="input-class"
              type="text"
              autoComplete="off"
              maxLength={80}
              minLength={2}
              value={recipientInstitution}
              onChange={(event) => setRecipientInstitution(event.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-14 font-medium text-gray-700 sm:col-span-2">
            Recipient account number
            <input
              className="input-class"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              pattern="[0-9]{4,17}"
              maxLength={17}
              minLength={4}
              value={recipientAccountNumber}
              onChange={(event) =>
                setRecipientAccountNumber(
                  event.target.value.replace(/\D/g, "").slice(0, 17)
                )
              }
              required
            />
            <span className="text-12 font-normal text-gray-500">
              Enter 4–17 digits. Only the last four are retained; the full number is
              discarded after submission.
            </span>
          </label>
        </div>
      )}

      <label className="flex flex-col gap-2 text-14 font-medium text-gray-700">
        Transfer method
        <select
          className="input-class"
          value={transferType}
          onChange={(event) => setTransferType(event.target.value as typeof transferType)}
        >
          {destination === "internal" && (
            <option value="internal">Internal account transfer</option>
          )}
          <option value="ach">ACH (pending)</option>
          <option value="same_day_ach">Same-day ACH</option>
          <option value="wire">Domestic wire</option>
          <option value="rtp">RTP real-time payment</option>
          <option value="fednow">FedNow payment</option>
          <option value="p2p">Person-to-person</option>
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
        className="payment-transfer_btn min-h-12 rounded-xl !text-15"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 size={20} className="animate-spin" /> &nbsp; Submitting...
          </>
        ) : (
          <>
            <ArrowDownUp size={18} /> &nbsp;
            {destination === "external"
              ? "Submit pending transfer request"
              : "Submit pending transfer"}
          </>
        )}
      </Button>
        </form>

        <aside className="transfer-summary space-y-4 xl:sticky xl:top-5">
          <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-chart">
            <div className="bg-[linear-gradient(135deg,#10283a_0%,#155a5c_100%)] p-5 text-white">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-teal-100">
                  <Landmark size={20} aria-hidden="true" />
                </span>
                <span className="rounded-full border border-amber-200/30 bg-amber-100/10 px-2.5 py-1 text-10 font-semibold uppercase tracking-wide text-amber-100">
                  Preview only
                </span>
              </div>
              <p className="mt-5 text-12 font-medium text-teal-100">
                Transfer overview
              </p>
              <p className="mt-1 break-all text-30 font-semibold tracking-tight">
                {formatAmount(Number(amount) || 0)}
              </p>
              <p className="mt-1 text-12 text-white/70">
                Requested amount · USD
              </p>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <p className="text-10 font-semibold uppercase tracking-[0.12em] text-gray-500">
                  From
                </p>
                <p className="mt-1 text-14 font-semibold text-gray-900">
                  {selectedAccount?.name ?? "Select an account"}
                </p>
                {selectedAccount && (
                  <p className="mt-0.5 text-12 text-gray-600">
                    Available · {formatAmount(selectedAccount.availableBalance)}
                  </p>
                )}
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-10 font-semibold uppercase tracking-[0.12em] text-gray-500">
                  To
                </p>
                <p className="mt-1 text-14 font-semibold text-gray-900">
                  {destination === "internal"
                    ? selectedDestination?.name ?? "Select an account"
                    : recipientName.trim() || "Recipient"}
                </p>
                <p className="mt-0.5 text-12 text-gray-600">
                  {destination === "internal"
                    ? "Your account · pending"
                    : recipientInstitution.trim() || "Another institution"}
                </p>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-10 font-semibold uppercase tracking-[0.12em] text-gray-500">
                  Method
                </p>
                <p className="mt-1 text-14 font-semibold capitalize text-gray-900">
                  {transferType.replaceAll("_", " ").toUpperCase()}
                </p>
                <p className="mt-0.5 text-12 text-gray-600">
                  Transfer method
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <CircleDollarSign size={18} aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-13 font-semibold text-gray-900">
                  What happens next?
                </h3>
                <p className="mt-1 text-12 leading-5 text-gray-600">
                  Your request is recorded as pending. An administrator can
                  update its status; a successful update changes only your
                  pending account balance.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>

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
              ) : receipt.status === "on_hold" ? (
                <Clock3 size={24} />
              ) : receipt.status === "action_required" ? (
                <AlertCircle size={24} />
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
                ? "The administrator marked this pending request successful. Your pending account balance has been updated."
                : receipt.status === "failed"
                  ? "The administrator marked this pending request failed. Account balances were not changed."
                  : receipt.status === "on_hold"
                    ? "The administrator placed this pending request on hold. Your pending balance has not changed."
                    : receipt.status === "action_required"
                      ? "The administrator needs more information before updating this pending request. Your pending balance has not changed."
                      : "This pending request is awaiting an administrator status update. Account balances will not change unless it is marked successful."}
            </p>
            <p className="mt-2 text-12 text-gray-500">
              Status and administrator messages refresh automatically while
              this screen is open.
            </p>
            {receipt.recipient && (
              <div className="mt-4 rounded-xl border border-gray-200 bg-gray-25 p-4">
                <p className="text-10 font-semibold uppercase tracking-wide text-gray-500">
                  External destination
                </p>
                <p className="mt-1 text-14 font-semibold text-gray-900">
                  {receipt.recipient.name}
                </p>
                <p className="mt-1 text-12 text-gray-600">
                  {receipt.recipient.institution} · Account ending in{" "}
                  {receipt.recipient.accountLast4}
                </p>
              </div>
            )}
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
                  Transfer method
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
                ? "A transfer request email was sent to your account email."
                : `Transfer saved, but email was not sent: ${receipt.emailReason}`}
            </p>
            {statusError && (
              <p className="mt-3 rounded-lg bg-red-50 p-3 text-12 text-red-700" role="alert">
                {statusError}
              </p>
            )}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={checkingStatus}
                onClick={async () => {
                  setCheckingStatus(true);
                  setStatusError("");
                  try {
                    const result = await getSimulatedTransferStatus(receipt.id);
                    const previousStatus = lastObservedStatus.current ?? {
                      status: "pending",
                      notice: "",
                    };
                    if (
                      previousStatus.status !== result.status ||
                      previousStatus.notice !== result.customerNotice
                    ) {
                      router.refresh();
                    }
                    lastObservedStatus.current = {
                      status: result.status,
                      notice: result.customerNotice,
                    };
                    setReceipt((current) =>
                      current
                        ? {
                            ...current,
                            status: result.status,
                            customerNotice: result.customerNotice,
                            recipient: result.recipient,
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
              Transfer instructions are reviewed securely. This does not initiate an ACH, wire, RTP, FedNow,
              or person-to-person network payment.
            </p>
          </section>
        </div>
      )}
    </>
  );
};

export default PaymentTransferForm;
