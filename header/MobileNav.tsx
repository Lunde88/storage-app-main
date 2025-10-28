"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SheetClose } from "../ui/sheet";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/inventory", label: "Inventory" },
  { href: "/reports", label: "Reports" },
  { href: "/bookings", label: "Bookings" },
  { href: "/settings", label: "Settings" },
];

export default function MobiledNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Mobile main navigation">
      <ul className="flex flex-col gap-3">
        {navLinks.map(({ href, label }) => {
          const isActive = pathname === href;
          return (
            <li key={href}>
              <SheetClose asChild>
                <Link
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "inline-block py-1 transition-colors duration-150",
                    isActive
                      ? "border-b-2 border-[#2D3ECD] font-bold text-[#2D3ECD]"
                      : "text-muted-foreground hover:text-primary border-b-2 border-transparent font-medium",
                  )}
                >
                  {label}
                </Link>
              </SheetClose>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
