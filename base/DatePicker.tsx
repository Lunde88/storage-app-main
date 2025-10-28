"use client";

import * as React from "react";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { enGB } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type SingleDatePickerProps = {
  id?: string;
  value: Date | null;
  onChange: (value: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  allowClear?: boolean;
  className?: string; // wrapper classes
  buttonClassName?: string; // trigger button classes
  "aria-label"?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  avoidCollisions?: boolean;
};

export default function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Select date",
  disabled,
  minDate,
  maxDate,
  allowClear = true,
  className,
  buttonClassName,
  "aria-label": ariaLabel,
  side = "bottom",
  align = "start",
  sideOffset = 4,
  avoidCollisions = true,
}: SingleDatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const isDisabled = React.useCallback(
    (date: Date): boolean => {
      const d = startOfDay(date);
      if (minDate && d < startOfDay(minDate)) return true;
      if (maxDate && d > endOfDay(maxDate)) return true;
      return false;
    },
    [minDate, maxDate],
  );

  const label = value
    ? format(value, "dd/MM/yyyy", { locale: enGB })
    : placeholder;

  const handleSelect = (d?: Date) => {
    onChange(d ?? null);
    setOpen(false);
  };

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={
              ariaLabel ?? (typeof label === "string" ? label : "Date")
            }
            className={cn("w-full justify-between", buttonClassName)}
          >
            <span className={cn(!value && "text-[#5C5757]/60")}>{label}</span>
            <span className="ml-3 flex items-center gap-1">
              {allowClear && value ? (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Clear date"
                  className="grid h-4 w-4 cursor-pointer place-items-center"
                  onPointerDown={(e) => {
                    e.preventDefault(); // stop Radix PopoverTrigger toggle
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange(null);
                    setOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      onChange(null);
                      setOpen(false);
                    }
                  }}
                >
                  <X className="h-4 w-4 text-[#5C5757]/70 hover:text-[#5C5757]" />
                </span>
              ) : null}
              <CalendarIcon className="h-4 w-4 text-[#2D3ECD]" />
            </span>
          </Button>
        </PopoverTrigger>

        <PopoverContent
          side={side}
          align={align}
          sideOffset={sideOffset}
          avoidCollisions={avoidCollisions}
        >
          <div className="h-[330px]">
            <Calendar
              mode="single"
              selected={value ?? undefined}
              onSelect={handleSelect}
              disabled={isDisabled}
              className="h-full"
              showOutsideDays={false}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* Helpers */
function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
