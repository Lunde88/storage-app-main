import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

type CardListItemProps = {
  href: string;
  children: React.ReactNode;
  right?: boolean;
  className?: string;
  bgTransparent?: boolean;
};

export default function CardListItem({
  href,
  children,
  right,
  className,
  bgTransparent,
}: CardListItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between rounded-md border-1 p-3",
        bgTransparent ? "bg-transparent" : "bg-[#FAFAFA]",
        className,
      )}
    >
      <div className="flex-1">{children}</div>
      {right && <ChevronRight />}
    </Link>
  );
}
