import BankCard from "@/components/shared/BankCard";
import HeaderBox from "@/components/shared/HeaderBox";
import { getAccounts } from "@/lib/actions/bank.action";
import { getLoggedInUser } from "@/lib/actions/user.action";
import { redirect } from "next/navigation";
import React from "react";

const MyBanks = async () => {
  const loggedIn = await getLoggedInUser();
  if (!loggedIn) redirect("/sign-in");

  const accounts = await getAccounts({ userId: loggedIn.$id });
  return (
    <section className="flex">
      <div className="my-banks">
        <HeaderBox title="My Bank Accounts" subtext="Manage Banking activity" />
        <div className="space-y-4">
          <h2 className="header-2">Your Bank Accounts</h2>
          <div className="flex flex-wrap gap-6">
            {accounts &&
              accounts.data.map((account: Account) => (
                <BankCard
                  key={accounts.id}
                  account={account}
                  userName={loggedIn?.firstName}
                />
              ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default MyBanks;
