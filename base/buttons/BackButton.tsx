import { Button } from "@/components/ui/button";
import Link from "next/link";

type BackButtonProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

export default function BackButton({
  href,
  children,
  className,
}: BackButtonProps) {
  return (
    <Button asChild variant="outline" size="sm" className={className}>
      <Link href={href}>{children}</Link>
    </Button>
  );
}
