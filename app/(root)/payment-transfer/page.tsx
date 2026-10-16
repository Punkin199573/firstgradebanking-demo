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
        title="Internal transfer"
        subtext="Preview an internal transfer between your simulated accounts."
      />
      <section className="size-full pt-5">
        <PaymentTransferForm accounts={accounts.data} />
      </section>
    </section>
  );
};

export default TransferFunds;
