"use client";

import {
  ArrowLeftToLine,
  ArrowRightFromLine,
  BarChart3,
  Calendar1,
  CarFront,
  CircleUserRound,
  Search,
} from "lucide-react";
import { Button } from "../ui/button";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import Link from "next/link";

const navLinks = [
  {
    label: "Search",
    href: "/search",
    icon: Search,
  },
  {
    label: "Bookings",
    href: "/bookings",
    icon: Calendar1,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
  },
  {
    label: "Clients",
    href: "/clients",
    icon: CircleUserRound,
  },
  {
    label: "Inventory",
    href: "/inventory",
    icon: CarFront,
  },
  {
    label: "Check in",
    href: "/check-in",
    icon: ArrowLeftToLine,
    className: "text-[#2D3ECD]",
  },
  {
    label: "Check out",
    href: "/check-out",
    icon: ArrowRightFromLine,
    className: "text-[#B23A48]",
  },
];

export default function DashboardSideNav() {
  const pathname = usePathname();
  const params = useSearchParams();

  const searchHref = `${pathname}?${new URLSearchParams({
    ...Object.fromEntries(params),
    search: "1",
  }).toString()}`;

  return (
    <nav
      aria-label="Sidebar"
      // className="bg-secondary hidden rounded-4xl border px-1.5 py-5.5 md:block"
      className="bg-secondary sticky top-28 left-0 hidden h-fit rounded-4xl border px-1.5 py-5.5 lg:block"
    >
      <ul className="flex flex-col items-center gap-5">
        {navLinks.map(({ label, href, icon: Icon, className }) => {
          const isActive = pathname === href;

          const linkHref = label === "Search" ? searchHref : href;
          return (
            <li key={label}>
              <Button
                asChild
                variant={"ghost"}
                size="icon"
                aria-label={label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  isActive && "bg-primary/10",
                  "hover:bg-primary/10",
                )}
                // className={isActive ? "border-primary border-b-2" : ""}
              >
                {/* !!!!! make button 'asChild' for link to work !!!!! */}
                <Link href={linkHref}>
                  <Icon className={cn("!h-6 !w-6", className)} />
                </Link>
              </Button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
