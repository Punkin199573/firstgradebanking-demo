import Link from "next/link";
import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { BankTabItem } from "./BankTabItem";

import BankInfo from "./BankInfo";
import TransactionsTable from "./TransactionsTable";

const RecentTransactions = ({
  accounts,
  transactionsByAccount,
  selectedAccountId,
}: RecentTransactionsProps) => {
  return (
    <section className="recent-transactions">
      <header className="flex items-center justify-between">
        <h2 className="recent-transactions-label">Recent Transactions</h2>
        <Link
          href={`/transaction-history/?id=${selectedAccountId}`}
          className="view-all-btn"
        >
          View All
        </Link>
      </header>
      <Tabs defaultValue={selectedAccountId} className="w-full">
        <TabsList className="recent-transactions-tablist">
          {accounts.map((account) => (
            <TabsTrigger
              key={account.id}
              value={account.id}
              className=""
            >
              <BankTabItem
                account={account}
                selectedAccountId={selectedAccountId}
                key={account.id}
              />
            </TabsTrigger>
          ))}
        </TabsList>
        {accounts.map((account) => (
          <TabsContent
            key={account.id}
            value={account.id}
            className="space-y-4"
          >
            <BankInfo
              account={account}
              selectedAccountId={selectedAccountId}
              type="full"
            />
            <TransactionsTable
              transactions={transactionsByAccount[account.id] ?? []}
            />
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
};

export default RecentTransactions;
