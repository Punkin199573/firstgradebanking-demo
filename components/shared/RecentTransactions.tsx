import Link from "next/link";
import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { BankTabItem } from "./BankTabItem";

import BankInfo from "./BankInfo";
import TransactionsTable from "./TransactionsTable";

const RecentTransactions = ({
  accounts,
  transactions = [],
  appwriteItemId,
  page,
}: RecentTransactionsProps) => {
  return (
    <section className="recent-transactions">
      <header className="flex items-center justify-between">
        <h2 className="recent-transactions-label">Recent Transactions</h2>
        <Link
          href={`/transaction-history/?id=${appwriteItemId}`}
          className="view-all-btn"
        >
          View All
        </Link>
      </header>
      <Tabs defaultValue={appwriteItemId} className="w-full">
        <TabsList className="recent-transactions-tablist">
          {accounts.map((account) => (
            <TabsTrigger
              key={account.appwriteItemId}
              value={account.appwriteItemId}
              className=""
            >
              <BankTabItem
                account={account}
                appwriteItemId={appwriteItemId}
                key={account.id}
              />
            </TabsTrigger>
          ))}
        </TabsList>
        {accounts.map((account) => (
          <TabsContent
            key={account.appwriteItemId}
            value={account.appwriteItemId}
            className="space-y-4"
          >
            <BankInfo
              account={account}
              appwriteItemId={appwriteItemId}
              type="full"
            />
            <TransactionsTable transactions={transactions} />
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
};

export default RecentTransactions;
