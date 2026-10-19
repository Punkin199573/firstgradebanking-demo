import { formatAmount } from "@/lib/utils";
import React from "react";
import AnimatedCounter from "./AnimatedCounter";
import DoughnutChart from "./DoughnutChart";
import BalanceCarousel from "./BalanceCarousel";

const TotalBalanceBox = ({
  accounts = [],
  totalBanks = 0,
  totalCurrentBalance = 0,
}: TotlaBalanceBoxProps) => {
  return (
    <section className="total-balance-shell">
      <div className="total-balance-summary">
        <div className="total-balance-chart">
          <DoughnutChart accounts={accounts} />
        </div>
        <div className="total-balance-copy">
          <div className="flex items-center gap-2">
            <p className="section-kicker">Total balance</p>
            <span className="account-count">{totalBanks} {totalBanks === 1 ? "account" : "accounts"}</span>
          </div>
          <div className="total-balance-amount flex-center gap-2">
            <AnimatedCounter amount={totalCurrentBalance} />
          </div>
          <p className="total-balance-label">Across your First Grade accounts</p>
        </div>
      </div>
      <BalanceCarousel accounts={accounts} />
    </section>
  );
};

export default TotalBalanceBox;
