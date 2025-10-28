// Success feedback UI
"use client";
import { Button } from "@/components/ui/button";
// import TickIcon from "@/components/icons/TickIcon.svg";
import Link from "next/link";

type SuccessMessageProps = {
  title?: string;
  subtitle?: string;
  href?: string;
  buttonText?: string;
};

export default function SuccessMessage({
  title = "Success!",
  subtitle = "Vehicle has been checked in",
  href = "/dashboard",
  buttonText = "Continue to dashboard",
}: SuccessMessageProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[linear-gradient(179.98deg,#596AF4_0.02%,#001087_82.07%)] px-4 py-8">
      {/* Centre block */}
      <div className="grid flex-1 place-items-center text-center">
        <div>
          <svg
            className="mx-auto h-12 w-12 text-white"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M9 16.2 5.5 12.7l1.4-1.4 2.1 2.1 5.7-5.7 1.4 1.4z"
            />
          </svg>
          <h2 className="mt-3 mb-2 text-2xl font-bold text-white">{title}</h2>
          <p className="mb-6 text-white">{subtitle}</p>
        </div>
      </div>

      {/* Bottom button */}
      <div className="mb-8 w-full max-w-sm self-center [padding-bottom:env(safe-area-inset-bottom)]">
        <Button
          className="h-[48px] w-full rounded-[32px] bg-[#2D3ECD] px-8 py-2 hover:bg-[#2D3ECD]/80"
          asChild
        >
          <Link href={href}>{buttonText}</Link>
        </Button>
      </div>
    </div>
  );
}
