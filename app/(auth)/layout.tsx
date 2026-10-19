import { ArrowUpRight, Check, CircleDollarSign, ShieldCheck } from "lucide-react";
import React from "react";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="auth-layout">
      <div className="auth-content">{children}</div>
      <aside className="auth-asset" aria-label="First Grade Finance overview">
        <div className="auth-showcase">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="auth-brand-icon">
                <CircleDollarSign size={24} />
              </span>
              <div>
                <p className="text-16 font-semibold text-white">First Grade</p>
                <p className="text-10 font-semibold tracking-[0.2em] text-teal-100">
                  FINANCE
                </p>
              </div>
            </div>
          </div>

          <div className="auth-showcase-copy">
            <p className="text-12 font-semibold uppercase tracking-[0.2em] text-teal-200">
              A clearer financial picture
            </p>
            <h2 className="mt-4 max-w-xl font-ibm-plex-serif text-4xl font-bold leading-tight tracking-tight text-white xl:text-5xl">
              A stronger view
              <br />
              of your finances.
            </h2>
            <p className="mt-5 max-w-lg text-16 leading-7 text-slate-200">
              Manage your accounts and transfers with clarity and confidence.
            </p>
          </div>

          <div className="auth-preview-card">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-12 font-medium text-slate-300">
                  Your workspace
                </p>
                <p className="mt-1 text-18 font-semibold text-white">
                  Your accounts
                </p>
              </div>
            </div>
            <div className="auth-preview-account">
              <div className="flex size-10 items-center justify-center rounded-xl bg-teal-300/10 text-teal-200">
                <CircleDollarSign size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-14 font-semibold text-white">
                  Everyday account
                </p>
                <p className="mt-1 text-12 text-slate-300">
                  Everyday account · •••• 4821
                </p>
              </div>
              <ArrowUpRight size={18} className="text-teal-200" />
            </div>
            <div className="auth-preview-note">
              <ShieldCheck size={17} />
              <span>Protected account activity</span>
            </div>
          </div>

          <ul className="auth-showcase-points">
            <li>
              <Check size={16} />
              Clear account and activity views
            </li>
            <li>
              <Check size={16} />
              Transfer scenarios with visible status updates
            </li>
          </ul>
        </div>
      </aside>
    </main>
  );
}
