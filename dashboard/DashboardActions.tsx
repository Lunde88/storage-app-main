import { ArrowLeftToLine, ArrowRightFromLine } from "lucide-react";
import { Button } from "../ui/button";
import Link from "next/link";

export default function DashboardActions() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 w-screen pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] lg:hidden">
      {/* Blur layer behind the content */}
      <div className="pointer-events-none absolute inset-0 border-t border-white/20 bg-white/20 backdrop-blur-xs supports-[backdrop-filter]:bg-white/30" />

      {/* Content stays crisp */}
      <div className="relative z-10 mx-auto flex w-full items-center justify-center gap-3 py-5">
        <Button
          asChild
          className="flex h-12 w-[165.5px] items-center justify-center gap-2.5 rounded-[32px] border border-[#2D3ECD] bg-[#F0F1FF] px-8 py-2 text-sm font-medium text-[#2D3ECD]"
        >
          <Link href="/check-in">
            Check in
            <ArrowLeftToLine className="!h-6 !w-6" />
          </Link>
        </Button>

        <Button
          asChild
          className="flex h-12 w-[165.5px] items-center justify-center gap-2.5 rounded-[32px] border border-[#86101E] bg-[#FFE4E7] px-8 py-2 text-sm font-medium text-[#86101E]"
        >
          <Link href="/check-out">
            Check out
            <ArrowRightFromLine className="!h-6 !w-6" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
