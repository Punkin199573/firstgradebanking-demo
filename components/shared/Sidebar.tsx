"use client";
import { getNavigationLinks, isNavigationItemActive } from "@/constants";
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
      <nav aria-label="Primary navigation" className="flex flex-col gap-3">
        <Link
          href={`/`}
          className="mb-12 cursor-pointer items-center gap-2 flex"
        >
          <Image
            src="/icons/logo.svg"
            alt="First Grade Finance home"
            width={40}
            height={40}
            className="size-[60px] max-xl:size-30"
          />
          <h1 className="sidebar-logo">
            First Grade
            <span className="block text-12 font-medium tracking-[0.08em] text-gray-500">
              FINANCE
            </span>
          </h1>
        </Link>
        {getNavigationLinks(user.role).map((link) => {
          const isActive = isNavigationItemActive(pathname, link.route);
          return (
            <Link
              href={link.route}
              key={link.label}
              aria-current={isActive ? "page" : undefined}
              className={cn("sidebar-link", {
                "bg-[#153d3b] shadow-[0_10px_24px_-16px_rgba(21,61,59,0.7)]": isActive,
                "hover:bg-[#edf6f3]": !isActive,
              })}
            >
              <div className="relative size-6">
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
