"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type NextButtonProps = React.ComponentProps<typeof Button> & {
  text?: string;
  isLoading?: boolean;
};

export default function NextButton({
  text = "Next",
  isLoading = false,
  className,
  type = "button",
  variant = "default",
  ...props
}: NextButtonProps) {
  return (
    <Button
      type={type}
      variant={variant}
      disabled={isLoading || props.disabled} // Disable button when loading
      className={`h-12 rounded-[32px] bg-[#2D3ECD] px-0 py-3 text-[#FFFFFF] transition-colors duration-200 hover:bg-[#2D3ECD]/80 disabled:bg-[#E4E4E4] disabled:text-[#5C5757] ${className ?? ""}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {text}
        </>
      ) : (
        text
      )}
    </Button>
  );
}
