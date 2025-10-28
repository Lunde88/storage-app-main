import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
} from "@/components/ui/select";
import { LocationDetails } from "@/lib/types";
import { cn } from "@/lib/utils";

import { ChevronDown, MapPin } from "lucide-react";

type DashboardLocation = Pick<LocationDetails, "id" | "name">;

type FormSelectProps = {
  id: string;
  label: string;
  value: string;
  onValueChange: (val: string) => void;
  options: DashboardLocation[];
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
};

export function LocationSelect({
  id,
  value,
  onValueChange,
  options,
  disabled,
  placeholder = "Select…",
}: FormSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        id={id}
        className={cn(
          "!text-primary !shadow-regular mr-3 flex !h-[48px] min-w-0 flex-1 items-center justify-between rounded-[56px] bg-white p-3 text-base font-medium",
          // optional cap on max width so it doesn’t stretch too far
          "max-w-xs md:max-w-sm",
        )}
      >
        <span className="flex min-w-0 items-center truncate">
          <MapPin className="mr-1 !h-6 !w-6 shrink-0 text-[#2D3ECD]" />
          <SelectValue placeholder={placeholder} className="truncate" />
        </span>
        <ChevronDown className="ml-2 !h-6 !w-6 shrink-0 text-[#2D3ECD]" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="all" className="cursor-pointer">
            {placeholder}
          </SelectItem>
        </SelectGroup>

        <SelectSeparator />
        <SelectGroup>
          {options.map((option) => (
            <SelectItem
              key={option.id}
              value={option.id}
              className="cursor-pointer"
            >
              {option.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
