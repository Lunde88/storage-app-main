import React from "react";
import { cn } from "@/lib/utils"; // If you use classnames utility
import { Input } from "@/components/ui/input";

type FormInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        className={cn("rounded-sm !text-base", className)}
        {...props}
      />
    );
  },
);
FormInput.displayName = "FormInput";
