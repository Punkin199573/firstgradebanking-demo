"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  adjustDemoAccountBalance,
  recordDemoTransaction,
  updateSimulatedTransaction,
} from "@/lib/actions/admin.action";
import { formatAmount } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type AdminData = Awaited<
  ReturnType<typeof import("@/lib/actions/admin.action").getAdminDashboardData>
>;

export default function AdminDashboard({ data }: { data: AdminData }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(
    data.users[0]?.id ?? ""
  );
  const [accountId, setAccountId] = useState("");
  const [balance, setBalance] = useState("");
  const [balanceNote, setBalanceNote] = useState("");
  const [transactionName, setTransactionName] = useState("");
  const [transactionAmount, setTransactionAmount] = useState("");
  const [direction, setDirection] = useState<"debit" | "credit">("credit");
  const [category, setCategory] = useState("Adjustment");
  const [newTransactionStatus, setNewTransactionStatus] =
    useState<Transaction["status"]>("pending");
  const [transactionStatus, setTransactionStatus] =
    useState<Transaction["status"]>(
      data.transactions.find(
        (transaction) => transaction.user_id === data.users[0]?.id
      )?.status ?? "pending"
    );
  const [newCustomerNotice, setNewCustomerNotice] = useState("");
  const [customerNotice, setCustomerNotice] = useState(
    data.transactions.find(
      (transaction) => transaction.user_id === data.users[0]?.id
    )?.customer_notice ?? ""
  );
  const [selectedTransactionId, setSelectedTransactionId] = useState(
    data.transactions.find(
      (transaction) => transaction.user_id === data.users[0]?.id
    )?.id ?? ""
  );
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const statusEditorRef = useRef<HTMLDivElement>(null);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return data.users;
    return data.users.filter((user) =>
      `${user.first_name} ${user.last_name} ${user.email}`
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [data.users, query]);

  const selectedUser = data.users.find((user) => user.id === selectedUserId);
  const accounts = data.accounts.filter(
    (account) => account.user_id === selectedUserId
  );
  const selectedAccountId = accounts.some((account) => account.id === accountId)
    ? accountId
    : (accounts[0]?.id ?? "");
  const account = accounts.find((item) => item.id === selectedAccountId);
  const transactions = data.transactions.filter(
    (transaction) => transaction.user_id === selectedUserId
  );
  const selectedTransaction =
    transactions.find(
      (transaction) => transaction.id === selectedTransactionId
    ) ?? transactions[0];

  const submit = async (
    event: FormEvent<HTMLFormElement>,
    action: "balance" | "transaction" | "status"
  ) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      if (action === "balance") {
        const result = await adjustDemoAccountBalance({
          accountId: selectedAccountId,
          balance: Number(balance),
          note: balanceNote,
        });
        setNotice(
          `Balance updated and audit record created. ${
            result.email.sent
              ? "Customer notification email sent."
              : `Customer email not sent: ${result.email.reason}`
          }`
        );
        setBalance("");
        setBalanceNote("");
      } else if (action === "transaction") {
        const result = await recordDemoTransaction({
          accountId: selectedAccountId,
          name: transactionName,
          amount: Number(transactionAmount),
          direction,
          category,
          status: newTransactionStatus,
          customerNotice: newCustomerNotice,
        });
        setNotice(
          `${
            newTransactionStatus === "successful"
              ? "Simulated transaction recorded and account balance updated."
              : "Simulated transaction recorded. No balance change was made."
          } ${
            result.email.sent
              ? "Customer notification email sent."
              : `Customer email not sent: ${result.email.reason}`
          }`
        );
        setTransactionName("");
        setTransactionAmount("");
        setNewCustomerNotice("");
      } else if (selectedTransaction) {
        const result = await updateSimulatedTransaction({
          transactionId: selectedTransaction.id,
          status: transactionStatus,
          customerNotice,
        });
        setNotice(
          `Transaction status and customer notice updated. ${
            result.email.sent
              ? "Customer notification email sent."
              : `Customer email not sent: ${result.email.reason}`
          }`
        );
      }
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Admin action failed."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-console flex h-full w-full flex-col gap-7 overflow-y-auto bg-gray-25 p-5 sm:p-8">
      <header className="admin-hero relative overflow-hidden rounded-3xl p-6 text-white sm:p-9">
        <div className="relative z-10 max-w-3xl">
          <p className="text-12 font-semibold uppercase tracking-[0.2em] text-teal-200">
            First Grade Finance · Operations
          </p>
          <h1 className="mt-3 text-30 font-semibold sm:text-36">
            Admin command center
          </h1>
          <p className="mt-3 max-w-2xl text-14 leading-6 text-slate-300">
            Manage simulated accounts, transaction lifecycles, and customer
            notices. All changes are audited; no real funds move. Customer email
            alerts require the configured transactional email provider.
          </p>
          <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-200/10 px-3 py-1.5 text-12 font-medium text-amber-100">
            Prototype environment · simulated data
          </span>
        </div>
        <div aria-hidden="true" className="admin-hero-orbit" />
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Registered profiles" value={String(data.users.length)} />
        <Metric
          label="Simulated accounts"
          value={String(data.accounts.length)}
        />
        <Metric
          label="Ledger entries"
          value={String(data.transactions.length)}
        />
      </div>

      {notice && (
        <p className="rounded-lg bg-success-50 p-4 text-14 text-success-700" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="rounded-lg bg-red-50 p-4 text-14 text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(260px,0.8fr)_minmax(0,2fr)]">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-chart">
          <h2 className="text-18 font-semibold text-gray-900">Users</h2>
          <input
            className="input-class mt-4"
            type="search"
            placeholder="Search name or email"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="mt-4 flex max-h-[560px] flex-col gap-2 overflow-y-auto">
            {filteredUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => {
                  setSelectedUserId(user.id);
                  setAccountId("");
                  setSelectedTransactionId("");
                  const firstTransaction = data.transactions.find(
                    (transaction) => transaction.user_id === user.id
                  );
                  setTransactionStatus(firstTransaction?.status ?? "pending");
                  setCustomerNotice(firstTransaction?.customer_notice ?? "");
                }}
                className={`rounded-xl border p-3 text-left transition ${
                  selectedUserId === user.id
                    ? "border-blue-500 bg-blue-25"
                    : "border-gray-200 hover:bg-gray-25"
                }`}
              >
                <span className="block text-14 font-semibold text-gray-900">
                  {`${user.first_name} ${user.last_name}`.trim() || "New user"}
                </span>
                <span className="mt-1 block break-all text-12 text-gray-600">
                  {user.email}
                </span>
                <span className="mt-2 inline-flex rounded-full bg-gray-100 px-2 py-1 text-10 font-medium uppercase text-gray-700">
                  {user.role}
                </span>
              </button>
            ))}
            {filteredUsers.length === 0 && (
              <p className="py-6 text-center text-14 text-gray-500">
                No users match that search.
              </p>
            )}
          </div>
        </section>

        <div className="flex min-w-0 flex-col gap-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-chart">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-18 font-semibold text-gray-900">
                  {selectedUser
                    ? `${selectedUser.first_name} ${selectedUser.last_name}`.trim() ||
                      selectedUser.email
                    : "Select a user"}
                </h2>
                {selectedUser && (
                  <p className="mt-1 text-14 text-gray-600">
                    {selectedUser.email}
                  </p>
                )}
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-12 font-medium text-amber-800">
                Simulated profile
              </span>
            </div>

            <label className="mt-5 flex max-w-xl flex-col gap-2 text-12 font-semibold text-gray-600">
              Selected account
              <select
                className="input-class bg-white"
                value={selectedAccountId}
                onChange={(event) => setAccountId(event.target.value)}
                disabled={!accounts.length}
              >
                {accounts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {formatAmount(Number(item.current_balance))}
                  </option>
                ))}
              </select>
            </label>

            {account ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Detail label="Account number" value={account.account_number} />
                <Detail label="Synthetic routing number" value={account.routing_number} />
                <Detail
                  label="Available balance"
                  value={formatAmount(Number(account.available_balance))}
                />
                <Detail
                  label="Current balance"
                  value={formatAmount(Number(account.current_balance))}
                />
              </div>
            ) : (
              <p className="mt-5 rounded-lg bg-gray-25 p-4 text-14 text-gray-600">
                This user has no simulated account yet.
              </p>
            )}
            <p className="mt-4 text-12 text-gray-500">
              Routing number 000000000 is intentionally invalid and cannot
              route real payments.
            </p>
          </section>

          {accounts.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-2">
              <form
                onSubmit={(event) => submit(event, "balance")}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-chart"
              >
                <h2 className="text-16 font-semibold text-gray-900">
                  Adjust simulated balance
                </h2>
                <p className="mt-1 text-12 text-gray-600">
                  The change is appended to the user&apos;s ledger and admin
                  audit history.
                </p>
                <label className="mt-4 flex flex-col gap-2 text-12 font-semibold text-gray-600">
                  New balance (USD)
                  <input
                    className="input-class"
                    type="number"
                    min="0"
                    max="99999999.99"
                    step="0.01"
                    required
                    value={balance}
                    onChange={(event) => setBalance(event.target.value)}
                  />
                </label>
                <label className="mt-3 flex flex-col gap-2 text-12 font-semibold text-gray-600">
                  Reason
                  <input
                    className="input-class"
                    maxLength={200}
                    required
                    value={balanceNote}
                    onChange={(event) => setBalanceNote(event.target.value)}
                  />
                </label>
                <Button className="mt-4 w-full" type="submit" disabled={busy}>
                  Save balance adjustment
                </Button>
              </form>

              <form
                onSubmit={(event) => submit(event, "transaction")}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-chart"
              >
                <h2 className="text-16 font-semibold text-gray-900">
                  Record simulated transaction
                </h2>
                <p className="mt-1 text-12 text-gray-600">
                  Only successful entries update balances; overdrafts are blocked.
                </p>
                <label className="mt-4 flex flex-col gap-2 text-12 font-semibold text-gray-600">
                  Description
                  <input
                    className="input-class"
                    maxLength={120}
                    required
                    value={transactionName}
                    onChange={(event) => setTransactionName(event.target.value)}
                  />
                </label>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-2 text-12 font-semibold text-gray-600">
                    Amount (USD)
                    <input
                      className="input-class"
                      type="number"
                      min="0.01"
                      max="1000000"
                      step="0.01"
                      required
                      value={transactionAmount}
                      onChange={(event) =>
                        setTransactionAmount(event.target.value)
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-12 font-semibold text-gray-600">
                    Direction
                    <select
                      className="input-class bg-white"
                      value={direction}
                      onChange={(event) =>
                        setDirection(event.target.value as "debit" | "credit")
                      }
                    >
                      <option value="credit">Credit</option>
                      <option value="debit">Debit</option>
                    </select>
                  </label>
                </div>
                <label className="mt-3 flex flex-col gap-2 text-12 font-semibold text-gray-600">
                  Category
                  <input
                    className="input-class"
                    maxLength={40}
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  />
                </label>
                <label className="mt-3 flex flex-col gap-2 text-12 font-semibold text-gray-600">
                  Initial status
                  <select
                    className="input-class bg-white"
                    value={newTransactionStatus}
                    onChange={(event) =>
                      setNewTransactionStatus(
                        event.target.value as Transaction["status"]
                      )
                    }
                  >
                    <option value="pending">Pending</option>
                    <option value="successful">Successful</option>
                    <option value="on_hold">On hold</option>
                    <option value="action_required">Action required</option>
                    <option value="failed">Failed</option>
                  </select>
                </label>
                <label className="mt-3 flex flex-col gap-2 text-12 font-semibold text-gray-600">
                  Customer notice (optional)
                  <textarea
                    className="input-class min-h-24 resize-y bg-white p-3"
                    maxLength={500}
                    placeholder="For example: Please contact support for assistance."
                    value={newCustomerNotice}
                    onChange={(event) => setNewCustomerNotice(event.target.value)}
                  />
                </label>
                <p className="mt-2 text-12 leading-5 text-gray-500">
                  Only a successful simulated transaction changes the displayed
                  balance. Notices appear in the customer transaction history
                  and are emailed when transactional email is configured.
                </p>
                <Button className="mt-4 w-full" type="submit" disabled={busy}>
                  Record transaction
                </Button>
              </form>
            </div>
          )}

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-chart sm:p-6">
            <div ref={statusEditorRef} />
            <div>
              <h2 className="text-18 font-semibold text-gray-900">
                Transaction status &amp; customer notice
              </h2>
              <p className="mt-1 max-w-3xl text-12 leading-5 text-gray-600">
                Select any recorded simulated transaction to update its status
                or customer notice. Status corrections are audited and reconcile
                simulated balances where applicable.
              </p>
            </div>
            {transactions.length > 0 ? (
              <form
                onSubmit={(event) => submit(event, "status")}
                className="mt-5 grid gap-4 lg:grid-cols-2"
              >
                {selectedTransaction && (
                  <div className="rounded-2xl border border-gray-200 bg-gray-25 p-4 lg:col-span-2">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-12 font-medium text-gray-500">
                          Selected transaction
                        </p>
                        <p className="mt-1 break-words text-16 font-semibold text-gray-900">
                          {selectedTransaction.name}
                        </p>
                        <p className="mt-1 text-12 text-gray-600">
                          {selectedTransaction.direction === "debit"
                            ? "Debit"
                            : "Credit"}{" "}
                          · {formatAmount(Number(selectedTransaction.amount))}
                          {selectedTransaction.payment_channel.startsWith(
                            "simulated_"
                          ) && " · Simulated transfer"}
                        </p>
                      </div>
                      <StatusBadge status={selectedTransaction.status} />
                    </div>
                    {selectedTransaction.customer_notice && (
                      <p className="mt-3 rounded-xl border border-blue-100 bg-blue-25 p-3 text-12 leading-5 text-blue-900">
                        <span className="font-semibold">Current customer notice: </span>
                        {selectedTransaction.customer_notice}
                      </p>
                    )}
                  </div>
                )}
                <label className="flex flex-col gap-2 text-12 font-semibold text-gray-600">
                  Transaction
                  <select
                    className="input-class bg-white"
                    value={selectedTransaction?.id ?? ""}
                    onChange={(event) => {
                      const next = transactions.find(
                        (item) => item.id === event.target.value
                      );
                      setSelectedTransactionId(event.target.value);
                      if (next) {
                        setTransactionStatus(next.status);
                        setCustomerNotice(next.customer_notice);
                      }
                    }}
                  >
                    {transactions.map((transaction) => (
                      <option key={transaction.id} value={transaction.id}>
                        {transaction.name} · {transaction.status.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-12 font-semibold text-gray-600">
                  New status
                  <select
                    className="input-class bg-white"
                    value={transactionStatus}
                    disabled={!selectedTransaction}
                    onChange={(event) =>
                      setTransactionStatus(
                        event.target.value as Transaction["status"]
                      )
                    }
                  >
                    <option value="pending">Pending</option>
                    <option value="successful">Successful</option>
                    <option value="on_hold">On hold</option>
                    <option value="action_required">Action required</option>
                    <option value="failed">Failed</option>
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-12 font-semibold text-gray-600 lg:col-span-2">
                  Customer-facing notice
                  <textarea
                    className="input-class min-h-24 resize-y bg-white p-3"
                    maxLength={500}
                    placeholder="A clear update for the customer, such as how to contact support."
                    value={customerNotice}
                    onChange={(event) => setCustomerNotice(event.target.value)}
                    disabled={!selectedTransaction}
                  />
                </label>
                <p className="text-12 leading-5 text-gray-500 lg:col-span-2">
                  Changing a successful status reverses or reapplies its
                  simulated balance effect. A reversal is blocked if the
                  account no longer has sufficient simulated funds. Every
                  change is recorded in the audit trail.
                </p>
                <div className="lg:col-span-2">
                  <Button
                    className="w-full sm:w-auto"
                    type="submit"
                    disabled={busy || !selectedTransaction}
                  >
                    {busy ? "Saving update..." : "Save status and customer notice"}
                  </Button>
                </div>
              </form>
            ) : (
              <p className="mt-4 rounded-xl bg-gray-25 p-4 text-14 text-gray-600">
                No transactions are available for this profile yet.
              </p>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-chart">
            <div className="border-b border-gray-200 p-5">
              <h2 className="text-18 font-semibold text-gray-900">
                Transaction history
              </h2>
              <p className="mt-1 text-12 text-gray-600">
                Ledger entries for {selectedUser?.email ?? "the selected user"}.
                Choose a row to load it into the status editor above.
              </p>
            </div>
            <div className="max-h-[440px] overflow-auto">
              <table className="w-full min-w-[640px] text-left text-12">
                <thead className="sticky top-0 bg-gray-25 text-gray-600">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Account</th>
                    <th className="p-3">Direction</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-t border-gray-100">
                      <td className="whitespace-nowrap p-3 text-gray-600">
                        {new Date(transaction.date).toLocaleString()}
                      </td>
                      <td className="p-3 font-medium text-gray-900">
                        {transaction.name}
                      </td>
                      <td className="p-3 text-gray-600">
                        {data.accounts.find(
                          (item) => item.id === transaction.account_id
                        )?.name ?? "Simulated account"}
                      </td>
                      <td className="p-3 capitalize text-gray-600">
                        {transaction.direction}
                      </td>
                      <td className="p-3">
                        <StatusBadge status={transaction.status} />
                        {transaction.customer_notice && (
                          <p className="mt-2 max-w-56 normal-case text-10 leading-4 text-gray-500">
                            {transaction.customer_notice}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap p-3 text-right font-semibold text-gray-900">
                        {transaction.direction === "debit" ? "−" : "+"}
                        {formatAmount(Number(transaction.amount))}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-gray-200 px-3 text-12 font-semibold text-gray-700 transition hover:border-teal-600 hover:text-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                          onClick={() => {
                            setSelectedTransactionId(transaction.id);
                            setTransactionStatus(transaction.status);
                            setCustomerNotice(transaction.customer_notice);
                            statusEditorRef.current?.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            });
                          }}
                        >
                          Edit status
                        </button>
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-500">
                        No transactions for this user.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-chart">
            <h2 className="text-18 font-semibold text-gray-900">
              Recent admin audit trail
            </h2>
            <div className="mt-3 divide-y divide-gray-100">
              {data.auditLog
                .filter((entry) => entry.target_user_id === selectedUserId)
                .slice(0, 10)
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="flex flex-wrap justify-between gap-2 py-3 text-12"
                  >
                    <span className="font-medium text-gray-800">
                      {entry.action.replaceAll("_", " ")}
                    </span>
                    <span className="text-gray-500">
                      {new Date(entry.created_at).toLocaleString()}
                    </span>
                    <span className="w-full break-words text-gray-600">
                      {JSON.stringify(entry.details)}
                    </span>
                  </div>
                ))}
              {data.auditLog.filter(
                (entry) => entry.target_user_id === selectedUserId
              ).length === 0 && (
                <p className="py-4 text-12 text-gray-500">
                  No admin actions recorded for this user.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-chart">
      <p className="text-12 font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-30 font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-25 p-4">
      <p className="text-10 font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 break-all font-mono text-14 font-semibold text-gray-900">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: Transaction["status"] }) {
  const styles: Record<Transaction["status"], string> = {
    pending: "border-amber-200 bg-amber-50 text-amber-800",
    successful: "border-success-100 bg-success-50 text-success-700",
    on_hold: "border-orange-200 bg-orange-50 text-orange-800",
    action_required: "border-blue-100 bg-blue-25 text-blue-800",
    failed: "border-red-100 bg-red-50 text-red-700",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-10 font-semibold capitalize ${styles[status]}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
