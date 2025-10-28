// components/FormField.tsx
import { Label } from "@/components/ui/label";
import { ReactNode } from "react";

type FormFieldProps = {
  label: string;
  htmlFor: string;
  children: ReactNode; // Pass <Input> or <Textarea> etc as a child
  required?: boolean;
  helperText?: string;
  error?: string | null;
};

export function FormField({
  label,
  htmlFor,
  children,
  required,
  helperText,
  error,
}: FormFieldProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor={htmlFor} className="mb-1.5 inline">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {helperText && (
        <span className="text-muted-foreground block text-xs">
          {helperText}
        </span>
      )}
      {error && <span className="text-destructive block text-xs">{error}</span>}
    </div>
  );
}
