import React from "react";
import { Button } from "../../ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

type IconButtonProps = {
  children: React.ReactElement<{ className?: string }>;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  href?: string;
  "aria-label"?: string;
};

function isReactElement(child: React.ReactNode): child is React.ReactElement {
  return React.isValidElement(child);
}

export default function IconButton({
  children,
  onClick,
  disabled,
  loading = false,
  className,
  href,
  ...rest
}: IconButtonProps) {
  let icon = children;

  if (isReactElement(children)) {
    icon = React.cloneElement(children, {
      className: cn(
        "!h-6 !w-6 text-[#2D3ECD]",
        loading && "animate-spin",
        children.props?.className,
      ),
    });
  }

  if (href) {
    return (
      <Button
        asChild
        size="icon"
        variant="outline"
        disabled={disabled || loading}
        className={cn(
          "bg-secondary h-12 w-12 shadow-[4px_4px_4px_0px_#0000000A]",
          className,
        )}
        {...rest}
      >
        <Link href={href} tabIndex={-1} aria-label={rest["aria-label"]}>
          {icon}
        </Link>
      </Button>
    );
  }

  return (
    <Button
      size="icon"
      variant="outline"
      disabled={disabled || loading}
      className={cn(
        "bg-secondary h-12 w-12 shadow-[4px_4px_4px_0px_#0000000A]",
        className,
      )}
      onClick={onClick}
      {...rest}
    >
      {icon}
    </Button>
  );
}
