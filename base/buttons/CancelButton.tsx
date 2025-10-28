"use client";

import { Button } from "@/components/ui/button";

type CancelButtonProps = React.ComponentProps<typeof Button> & {
  text?: string;
};

export default function CancelButton({
  text = "Cancel",
  className,
  type = "button",
  variant = "default",

  ...props
}: CancelButtonProps) {
  return (
    <Button
      type={type}
      variant={variant}
      className={`h-12 rounded-[32px] border border-[#2D3ECD] bg-[#F0F1FF]/80 px-0 py-3 text-[#2D3ECD] shadow-[4px_4px_4px_0px_rgba(0,0,0,0.04)] transition-colors duration-200 hover:bg-[#E0E5FF]/80 ${className ?? ""}`}
      {...props}
    >
      {text}
    </Button>
  );
}
