"use client";
import React from "react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import Image from "next/image";
import Link from "next/link";
import { getNavigationLinks, isNavigationItemActive } from "@/constants";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import Footer from "./Footer";
const MobileNav = ({ user }: MobileNavProps) => {
  const pathname = usePathname();
  return (
    <section className="w-full max-w-[264px] md:hidden">
      <Sheet>
        <SheetTrigger
          aria-label="Open navigation menu"
          className="mobile-menu-trigger"
        >
          <span>
            <Image
              src={"/icons/hamburger.svg"}
              alt=""
              width={24}
              height={24}
              className="cursor-pointer"
            />
          </span>
        </SheetTrigger>
        <SheetContent className="mobile-nav-sheet border-none bg-white" side="left">
          <SheetHeader className="sr-only">
            <SheetTitle>Meridian Finance navigation</SheetTitle>
            <SheetDescription>Navigate to an account area.</SheetDescription>
          </SheetHeader>
          <Link
            href={`/`}
            className="flex cursor-pointer items-center gap-2 px-4"
          >
            <Image src="/icons/logo.svg" alt="Meridian Finance home" width={40} height={40} />
            <h1 className="text-18 font-semibold leading-tight text-black-1">
              Meridian
              <span className="block text-10 font-medium tracking-[0.16em] text-gray-500">
                FINANCE
              </span>
            </h1>
          </Link>
          <div className="mobilenav-sheet">
            <SheetClose asChild>
              <nav
                aria-label="Primary navigation"
                className="flex h-full flex-col gap-2 pt-8 text-white"
              >
                {getNavigationLinks(user.role).map((link) => {
                  const isActive = isNavigationItemActive(pathname, link.route);
                  return (
                    <Link
                      href={link.route}
                      key={link.label}
                      aria-current={isActive ? "page" : undefined}
                      className={cn("mobilenav-sheet_close", {
                        "bg-bankGradient": isActive,
                        "hover:bg-teal-50": !isActive,
                      })}
                    >
                      <Image
                        src={link.imgURL}
                        alt={link.label}
                        width={20}
                        height={20}
                        className={cn({
                          "brightness-[3] invert-0": isActive,
                        })}
                      />

                      <p
                        className={cn("text-16 font-semibold text-black-2", {
                          "!text-white": isActive,
                        })}
                      >
                        {link.label}
                      </p>
                    </Link>
                  );
                })}
              </nav>
            </SheetClose>
            <Footer user={user} type="mobile" />
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
};

export default MobileNav;
