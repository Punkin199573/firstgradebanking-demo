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
        <HeaderBox
          title="Demo bank accounts"
          subtext="Explore simulated accounts and balances. No real bank is connected."
        />
        <div className="space-y-4">
          <h2 className="header-2">Your Bank Accounts</h2>
          <div className="flex flex-wrap gap-6">
            {accounts &&
              accounts.data.map((account: Account) => (
                <article key={account.id} className="flex flex-col">
                  <BankCard account={account} userName={loggedIn.firstName} />
                  <details className="mt-3 max-w-[320px] rounded-xl border border-gray-200 bg-white p-4">
                    <summary className="cursor-pointer text-14 font-semibold text-gray-700">
                      Demo account details
                    </summary>
                    <dl className="mt-4 space-y-3 text-12">
                      <div className="flex justify-between gap-4">
                        <dt className="text-gray-500">Account number</dt>
                        <dd className="font-mono font-semibold text-gray-900">
                          {account.accountNumber}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-gray-500">Routing number</dt>
                        <dd className="font-mono font-semibold text-gray-900">
                          {account.routingNumber}
                        </dd>
                      </div>
                      <p className="text-10 text-amber-700">
                        Synthetic demo details only; they cannot be used for
                        real deposits, withdrawals, or payments.
                      </p>
                    </dl>
                  </details>
                </article>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default MyBanks;
