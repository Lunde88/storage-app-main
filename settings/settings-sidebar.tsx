"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils"; // if you have a classnames helper; otherwise inline

const items = [
  { href: "/settings/organisation", label: "Organisation" },
  { href: "/settings/locations", label: "Locations" },
  { href: "/settings/users", label: "Users" },
];

export function SettingsSidebar() {
  const pathname = usePathname();

  return (
    <Card className="p-2">
      <nav className="flex flex-col">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </Card>
  );
}
