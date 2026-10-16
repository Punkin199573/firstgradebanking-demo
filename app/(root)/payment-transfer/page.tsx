import HeaderBox from "@/components/shared/HeaderBox";
import PaymentTransferForm from "@/components/shared/PaymentTransferForm";
import { getAccounts } from "@/lib/actions/bank.action";
import { getLoggedInUser } from "@/lib/actions/user.action";
import { redirect } from "next/navigation";
import React from "react";

const TransferFunds = async () => {
  const loggedIn = await getLoggedInUser();
  if (!loggedIn) redirect("/sign-in");

  const accounts = await getAccounts({
    userId: loggedIn.$id,
  });

  if (!accounts) return;
  return (
    <section className="payment-transfer">
      <HeaderBox
        title="Transfer funds"
        subtext="Set up a transfer between your accounts or prepare a fictional request for another institution."
      />
      <section className="size-full pt-1">
        <PaymentTransferForm accounts={accounts.data} />
      </section>
    </section>
  );
};

export default TransferFunds;
