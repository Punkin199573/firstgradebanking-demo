import HeaderBox from "@/components/shared/HeaderBox";
import RecentTransactions from "@/components/shared/RecentTransactions";
import RightSidebar from "@/components/shared/RightSidebar";
import TotalBalanceBox from "@/components/shared/TotalBalanceBox";
import { getAccount, getAccounts } from "@/lib/actions/bank.action";
import { getLoggedInUser } from "@/lib/actions/user.action";
import { redirect } from "next/navigation";
import React from "react";

const Home = async ({ searchParams: { id } }: SearchParamProps) => {
  const loggedIn = await getLoggedInUser();
  if (!loggedIn) redirect("/sign-in");

  const accounts = await getAccounts({ userId: loggedIn.$id });
  if (!accounts) return;
  const selectedAccountId =
    (Array.isArray(id) ? id[0] : id) || accounts.data[0]?.id;
  const accountDetails = await Promise.all(
    accounts.data.map((account) => getAccount({ accountId: account.id }))
  );
  const transactionsByAccount = Object.fromEntries(
    accounts.data.map((account, index) => [
      account.id,
      accountDetails[index]?.transactions ?? [],
    ])
  );
  const selectedAccount = accountDetails.find(
    (account) => account?.data.id === selectedAccountId
  );

  return (
    <section className="home">
      <div className="home-content">
        <header className="home-header">
          <HeaderBox
            type="greeting"
            title="Welcome"
            user={loggedIn?.firstName || "Guest"}
            subtext="Explore your simulated accounts and transaction activity."
          />
          <TotalBalanceBox
            accounts={accounts?.data}
            totalBanks={accounts?.totalBanks}
            totalCurrentBalance={accounts?.totalCurrentBalance}
          />
        </header>
        <RecentTransactions
          accounts={accounts.data}
          transactionsByAccount={transactionsByAccount}
          selectedAccountId={selectedAccountId ?? ""}
        />
      </div>
      <RightSidebar
        user={loggedIn}
        transactions={selectedAccount?.transactions ?? []}
        banks={accounts.data.slice(0, 2)}
      />
    </section>
  );
};

export default Home;
