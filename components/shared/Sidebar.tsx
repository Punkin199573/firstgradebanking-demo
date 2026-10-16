"use client";
import { sidebarLinks } from "@/constants";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import React from "react";
import Footer from "./Footer";

const Sidebar = ({ user }: SiderbarProps) => {
  const pathname = usePathname();
  return (
    <section className="sidebar">
      <nav className="flex flex-col gap-4">
        <Link
          href={`/`}
          className="mb-12 cursor-pointer items-center gap-2 flex"
        >
          <Image
            src="/icons/logo.svg"
            alt="logo"
            width={40}
            height={40}
            className="size-[60px] max-xl:size-30"
          />
          <h1 className="sidebar-logo">Delan</h1>
        </Link>
        {sidebarLinks.map((link) => {
          const isActive = pathname === link.route;
          return (
            <Link
              href={link.route}
              key={link.label}
              className={cn("sidebar-link", {
                "bg-bankGradient": isActive,
                "hover:bg-purple-500 hover:animate-pulse": !isActive,
              })}
            >
              <div className="size-6  relative ">
                <Image
                  src={link.imgURL}
                  alt={link.label}
                  fill
                  className={cn({
                    "brightness-[3] invert-0": isActive,
                  })}
                />
              </div>
              <p className={cn("sidebar-label", { "!text-white": isActive })}>
                {link.label}
              </p>
            </Link>
          );
        })}
      </nav>
      <Footer user={user} type="desktop" />
    </section>
  );
};

export default Sidebar;
