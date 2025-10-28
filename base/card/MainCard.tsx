import { cn } from "@/lib/utils";
import { Card } from "../../ui/card";

type MainCardProps = {
  children?: React.ReactNode;
  className?: string;
};

export default function MainCard({ children, className }: MainCardProps) {
  return (
    <Card className={cn("!shadow-regular w-[351px] gap-3 py-3", className)}>
      {children}
    </Card>
  );
}
