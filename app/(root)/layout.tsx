import Sidebar from "@/components/shared/Sidebar";
import React from "react";
import Image from "next/image";
import MobileNav from "@/components/shared/MobileNav";
import { getLoggedInUser } from "@/lib/actions/user.action";
import { redirect } from "next/navigation";

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
    <main className="flex h-screen w-full font-inter">
      <Sidebar user={loggedIn} />
      <div className="flex size-full flex-col">
        <div className="root-layout">
          <Image src="/icons/logo.svg" alt="menu" width={40} height={40} />
          <div>
            <MobileNav user={loggedIn} />
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
