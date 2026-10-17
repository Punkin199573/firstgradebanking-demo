import { formatAmount } from "@/lib/utils";
import React from "react";
import AnimatedCounter from "./AnimatedCounter";
import DoughnutChart from "./DoughnutChart";

const TotalBalanceBox = ({
  accounts = [],
  totalBanks = 0,
  totalCurrentBalance = 0,
}: TotlaBalanceBoxProps) => {
  return (
    <section className="total-balance">
      <div className="total-balance-chart">
        <DoughnutChart accounts={accounts} />
      </div>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <h2 className="header-2">Total balance</h2>
          <span className="rounded-full bg-[#e7f4f0] px-2 py-1 text-10 font-semibold text-teal-800">
            {totalBanks} {totalBanks === 1 ? "account" : "accounts"}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <p className="total-balance-label">Total Current Balance</p>
          <div className="total-balance-amount flex-center gap-2">
            <AnimatedCounter amount={totalCurrentBalance} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default TotalBalanceBox;
