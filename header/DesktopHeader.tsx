import { SignedIn } from "@clerk/nextjs";
import {
  ArrowLeftToLine,
  ArrowRightFromLine,
  Bell,
  Settings,
} from "lucide-react";
import { Button } from "../ui/button";
import UserDropdown from "./UserDropdown";
import Link from "next/link";
import Image from "next/image";

import DashboardNav from "./DashboardNav";

export default function DesktopHeader() {
  return (
    <header className="shadow-regular fixed top-0 z-30 flex h-22 w-full items-center justify-between border-b bg-white px-10">
      <div className="flex items-center justify-center gap-8">
        <Link href="/dashboard" className="inline-block">
          <div className="relative h-16 w-32">
            <Image
              src="/images/shed5-logo.png"
              alt="Shed5"
              fill
              className="object-contain p-4"
              priority
              sizes="(max-width: 768px) 128px, 128px"
            />
          </div>
        </Link>
        <DashboardNav />
      </div>

      <SignedIn>
        <div className="flex gap-10">
          <div className="flex gap-3">
            <Button
              asChild
              variant="outline"
              className="!shadow-regular flex h-12 w-[165.5px] items-center justify-center gap-2.5 rounded-[32px] border border-[#2D3ECD] bg-[#F0F1FF] px-8 py-2 text-sm font-medium text-[#2D3ECD] hover:bg-[#F0F1FF]/80 hover:text-[#2D3ECD]/80"
            >
              <Link href="/check-in">
                Check in
                <ArrowLeftToLine className="!h-6 !w-6" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="!shadow-regular flex h-12 w-[165.5px] items-center justify-center gap-2.5 rounded-[32px] border border-[#E05867] bg-[#FFE4E7] px-8 py-2 text-sm font-medium text-[#86101E] hover:bg-[#FFE4E7]/80 hover:text-[#86101E]/80"
            >
              <Link href="/check-out">
                Check out
                <ArrowRightFromLine className="!h-6 !w-6" />
              </Link>
            </Button>
          </div>
          <div className="bg-secondary rounded-4xl border px-3 py-1">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open notification menu"
              >
                <Bell className="!h-6 !w-6" />
              </Button>
              <Button
                asChild
                variant="ghost"
                size="icon"
                aria-label="Open settings"
              >
                <Link href="/settings">
                  <Settings className="!h-6 !w-6" />
                </Link>
              </Button>
              <UserDropdown />
            </div>
          </div>
        </div>
      </SignedIn>
    </header>
  );
}
