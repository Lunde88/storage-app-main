"use client";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, LucideProps, Plus } from "lucide-react";
import React from "react";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "../ui/drawer";

// Mobile detection hook
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return isMobile;
}

// T is your entity type (Client, Vehicle, etc)
type EntityComboboxProps<T> = {
  items: T[];
  value: T | null;
  onChange: (item: T | null) => void;
  // These functions let you customise how the item appears and is searched
  getKey: (item: T) => string;
  getDisplayLabel: (item: T) => string;
  getDisplayNode: (item: T, selected: boolean) => React.ReactNode;
  getKeywords: (item: T) => string[];
  addNewLabel: string;
  loading?: boolean;
  error?: Error | null;
  placeholder?: string;
  emptyMessage?: string;
  icon?: React.ReactElement<LucideProps>;
};

function getSizedIcon(icon: React.ReactElement<LucideProps> | undefined) {
  if (icon && React.isValidElement(icon)) {
    return React.cloneElement(icon, {
      className: "h-5 w-5 " + (icon.props.className ?? ""),
    });
  }
  return null;
}

export function EntityCombobox<T>({
  items,
  value,
  onChange,
  getKey,
  getDisplayLabel,
  getDisplayNode,
  getKeywords,
  addNewLabel,
  loading,
  error,
  placeholder = "Select or add…",
  emptyMessage = "No results found.",
  icon,
}: EntityComboboxProps<T>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const isMobile = useIsMobile();
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const handleSelect = (item: T | null) => {
    // Blur the search input before closing
    searchRef.current?.blur();
    onChange(item);
    setOpen(false);
    setSearch("");
  };

  if (loading) return <div>Loading…</div>;
  if (error)
    return <div className="text-destructive">Error: {error.message}</div>;
  if (!loading && !error && items.length === 0) {
    return (
      <div className="text-muted-foreground bg-muted/40 rounded border px-2 py-3 text-sm">
        {emptyMessage}
        <br />
        {addNewLabel} to continue.
      </div>
    );
  }

  // ----- MOBILE DRAWER -----
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="shadow-regular text-md h-full w-full justify-between rounded-[12px] py-3 text-sm"
          >
            <div className="flex items-center">
              {icon && (
                <span className="mr-2 flex items-center">
                  {getSizedIcon(icon)}
                </span>
              )}
              {value ? getDisplayLabel(value) : placeholder}
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-[#2D3ECD]" />
          </Button>
        </DrawerTrigger>
        <DrawerContent className="flex h-[90dvh] flex-col !p-0">
          <Command
            filter={(_value, search, keywords = []) => {
              const haystack = keywords.join(" ").toLowerCase();
              return haystack.includes(search.toLowerCase()) ? 1 : 0;
            }}
            className="flex flex-1 flex-col"
          >
            <div className="bg-background sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3">
              <DrawerTitle hidden>{placeholder}</DrawerTitle>
              <DrawerDescription hidden>
                Start typing to search.
              </DrawerDescription>
              <CommandInput
                ref={searchRef}
                placeholder={"Search..."}
                value={search}
                onValueChange={setSearch}
                // autoFocus
                className="bg-background flex-1 border-0 text-base outline-none"
              />
              <DrawerClose asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 text-sm font-medium"
                  type="button"
                >
                  Cancel
                </Button>
              </DrawerClose>
            </div>
            <div className="flex-1 overflow-y-auto px-1 pt-2 pb-6">
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {items.map((item) => (
                  <CommandItem
                    key={getKey(item)}
                    aria-label={getDisplayLabel(item)}
                    value={getKey(item)}
                    onMouseDown={(e) => e.preventDefault()}
                    onSelect={() => handleSelect(item)}
                    className="py-2"
                    keywords={getKeywords(item)}
                  >
                    <Check
                      className={cn(
                        "mt-1 mr-2 h-4 w-4",
                        value && getKey(value) === getKey(item)
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    {getDisplayNode(
                      item,
                      !!value && getKey(value) === getKey(item),
                    )}
                  </CommandItem>
                ))}
                <CommandItem
                  onMouseDown={(e) => e.preventDefault()}
                  onSelect={() => handleSelect(null)}
                  value="add_new"
                  keywords={["add", "new"]}
                  className="py-2"
                >
                  <Check className="mr-2 h-4 w-4 opacity-0" />
                  <Plus className="mr-2 h-4 w-4" />
                  {addNewLabel}
                </CommandItem>
              </CommandGroup>
            </div>
          </Command>
        </DrawerContent>
      </Drawer>
    );
  }

  // ----- DESKTOP POPOVER -----
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="shadow-regular text-md h-full w-full justify-between rounded-[12px] py-3 text-sm"
        >
          <div className="flex items-center">
            {icon && (
              <span className="mr-2 flex items-center">
                {getSizedIcon(icon)}
              </span>
            )}
            {value ? getDisplayLabel(value) : placeholder}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-[#2D3ECD]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        avoidCollisions={false}
        // className="max-h-72 w-full overflow-y-auto p-0"
        className="max-h-[60vh] w-full overflow-y-auto p-0"
        style={{ width: "var(--radix-popover-trigger-width)" }}
      >
        <div ref={listRef} className="max-h-72 w-full overflow-y-auto">
          <Command
            filter={(_value, search, keywords = []) => {
              const haystack = keywords.join(" ").toLowerCase();
              return haystack.includes(search.toLowerCase()) ? 1 : 0;
            }}
          >
            <CommandInput
              ref={searchRef}
              placeholder={"Search..."}
              value={search}
              onValueChange={setSearch}
              autoFocus
              className="text-base"
            />
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={getKey(item)}
                  aria-label={getDisplayLabel(item)}
                  value={getKey(item)}
                  onMouseDown={(e) => e.preventDefault()}
                  onSelect={() => handleSelect(item)}
                  className="cursor-pointer py-2"
                  keywords={getKeywords(item)}
                >
                  <Check
                    className={cn(
                      "mt-1 mr-2 h-4 w-4",
                      value && getKey(value) === getKey(item)
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  {getDisplayNode(
                    item,
                    !!value && getKey(value) === getKey(item),
                  )}
                </CommandItem>
              ))}
              <CommandItem
                onMouseDown={(e) => e.preventDefault()}
                onSelect={() => handleSelect(null)}
                value="add_new"
                keywords={["add", "new"]}
                className="cursor-pointer py-2"
              >
                <Check className="mr-2 h-4 w-4 opacity-0" />
                <Plus className="mr-2 h-4 w-4" />
                {addNewLabel}
              </CommandItem>
            </CommandGroup>
          </Command>
        </div>
      </PopoverContent>
    </Popover>
  );
}
