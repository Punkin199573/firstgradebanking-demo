import Sidebar from "@/components/shared/Sidebar";
import React from "react";
import Image from "next/image";
import MobileNav from "@/components/shared/MobileNav";
import { getLoggedInUser } from "@/lib/actions/user.action";
import { redirect } from "next/navigation";
import ThemeToggle from "@/components/shared/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const loggedIn = await getLoggedInUser();
  if (!loggedIn) {
    redirect("/sign-in");
  }
  return (
    <main className="app-shell flex h-dvh min-h-[100svh] w-full overflow-hidden font-inter">
      <Sidebar user={loggedIn} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="root-layout">
          <div className="flex min-w-0 items-center gap-3">
            <Image src="/icons/logo.svg" alt="" width={36} height={36} />
            <span className="truncate text-14 font-semibold text-gray-900 sm:text-16">
              Meridian Finance
            </span>
            <span className="hidden rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-10 font-semibold uppercase tracking-wide text-teal-800 sm:inline-flex">
              Secure account management
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <MobileNav user={loggedIn} />
          </div>
        </div>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </main>
  );
}
