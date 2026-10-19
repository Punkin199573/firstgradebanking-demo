"use client";

import { ChevronLeft, ChevronRight, CreditCard } from "lucide-react";
import { useRef } from "react";
import { formatAmount } from "@/lib/utils";

export default function BalanceCarousel({ accounts }: { accounts: Account[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const move = (direction: "left" | "right") => {
    scrollerRef.current?.scrollBy({
      left: direction === "right" ? 292 : -292,
      behavior: "smooth",
    });
  };

  return (
    <div className="balance-carousel" aria-label="Your accounts">
      <div className="balance-carousel-heading">
        <div>
          <p className="section-kicker">Your accounts</p>
          <p className="balance-carousel-caption">Swipe to view each balance</p>
        </div>
        <div className="balance-carousel-controls" aria-label="Account cards">
          <button type="button" onClick={() => move("left")} aria-label="Previous account">
            <ChevronLeft aria-hidden="true" />
          </button>
          <button type="button" onClick={() => move("right")} aria-label="Next account">
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>
      <div ref={scrollerRef} className="balance-carousel-scroller" tabIndex={0}>
        {accounts.length ? accounts.map((account, index) => (
          <article className={`account-balance-card account-balance-card-${index % 3}`} key={account.id}>
            <div className="account-balance-card-topline">
              <span className="account-balance-icon"><CreditCard aria-hidden="true" /></span>
              <span className="account-balance-type">{account.subtype || "Account"}</span>
            </div>
            <p className="account-balance-name">{account.name}</p>
            <p className="account-balance-value">{formatAmount(account.currentBalance)}</p>
            <div className="account-balance-footer">
              <span>Available {formatAmount(account.availableBalance)}</span>
              <span>•••• {account.mask}</span>
            </div>
          </article>
        )) : (
          <article className="account-balance-card account-balance-empty">
            <p className="account-balance-name">No accounts yet</p>
            <p className="balance-carousel-caption">Your account balances will appear here.</p>
          </article>
        )}
      </div>
    </div>
  );
}
