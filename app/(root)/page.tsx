import HeaderBox from "@/components/shared/HeaderBox";
import RecentTransactions from "@/components/shared/RecentTransactions";
import RightSidebar from "@/components/shared/RightSidebar";
import TotalBalanceBox from "@/components/shared/TotalBalanceBox";
import { getAccount, getAccounts } from "@/lib/actions/bank.action";
import { getLoggedInUser } from "@/lib/actions/user.action";
import { redirect } from "next/navigation";
import React from "react";

const Home = async ({ searchParams: { id, page } }: SearchParamProps) => {
  const loggedIn = await getLoggedInUser();
  if (!loggedIn) redirect("/sign-in");

  const accounts = await getAccounts({ userId: loggedIn.$id });
  if (!accounts) return;
  const appwriteItemId = (id as string) || accounts.data[0]?.appwriteItemId;
  const account = await getAccount({ appwriteItemId });

  return (
    <section className="home">
      <div className="home-content">
        <header className="home-header">
          <HeaderBox
            type="greeting"
            title="Welcome"
            user={loggedIn?.firstName || "Guest"}
            subtext="Access and manage your account and transactions"
          />
          <TotalBalanceBox
            accounts={accounts?.data}
            totalBanks={accounts?.totalBanks}
            totalCurrentBalance={accounts?.totalCurrentBalance}
          />
        </header>
        <RecentTransactions
          accounts={accounts.data}
          transactions={account?.transactions}
          appwriteItemId={appwriteItemId}
          page={page ? +page : 1}
        />
      </div>
      <RightSidebar
        user={loggedIn}
        transactions={account?.transactions}
        banks={[accounts.data?.slice(0, 2)]}
      />
    </section>
  );
};

export default Home;
