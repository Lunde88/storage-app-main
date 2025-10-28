// components/SearchAnything.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Car, User2, Loader2, Search, Keyboard } from "lucide-react";

export const INITIAL_RESULTS: SearchResult = { vehicles: [], clients: [] };

export type Vehicle = {
  id: string;
  identifier: string; // reg / stock code
  make: string;
  model: string;
};

export type Client = {
  id: string;
  first_name: string;
  last_name: string;
  company_name?: string | null;
};

export type SearchResult = {
  vehicles: Vehicle[];
  clients: Client[];
};

type BaseItem = ({ kind: "vehicle" } & Vehicle) | ({ kind: "client" } & Client);

type Props = {
  mode?: "dialog" | "popover";
  endpoint?: string;
  showTrigger?: boolean;
  /** Your async fetcher: given a query, return vehicles + clients */

  /** Called when user chooses an item */
  onSelect?: (item: BaseItem) => void;
  /** Provide a custom trigger when mode="popover" */
  trigger?: React.ReactNode;
  /** Placeholder text */
  placeholder?: string;
  /** Bind ⌘K / Ctrl+K when mode="dialog" */
  enableShortcut?: boolean;
  /** Controlled open state (optional) */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export default function SearchAnything({
  mode = "dialog",
  endpoint = "/api/search",

  //   onSelect,
  trigger,
  showTrigger = true,
  placeholder = "Search vehicles or clients…",
  enableShortcut = true,
  open: controlledOpen,
  onOpenChange,
}: Props) {
  const router = useRouter();

  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<SearchResult>(INITIAL_RESULTS);

  const lastReqId = React.useRef(0);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const MIN_CHARS = 2;

  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  // Optional: ⌘K / Ctrl+K to toggle dialog mode
  React.useEffect(() => {
    if (mode !== "dialog" || !enableShortcut) return;
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "p") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [mode, enableShortcut, open, setOpen]);

  React.useEffect(() => {
    if (!open) {
      lastReqId.current++; // invalidate any late responses
      setQuery("");
      setData(INITIAL_RESULTS);
      setLoading(false);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 0); // after mount
    return () => clearTimeout(t);
  }, [open]);

  // Debounced search
  React.useEffect(() => {
    if (!open) return;

    const q = query.trim();
    if (q.length < MIN_CHARS) {
      // ← min chars (tweak to taste)
      setData(INITIAL_RESULTS);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const reqId = ++lastReqId.current;

    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${endpoint}?q=${encodeURIComponent(q)}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Search failed");
        const json = (await res.json()) as SearchResult;

        // Only apply if this is the latest request
        if (reqId === lastReqId.current) setData(json);
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
        }
      } finally {
        if (reqId === lastReqId.current) setLoading(false);
      }
    }, 250); // slightly gentler than 220ms

    return () => {
      controller.abort();
      clearTimeout(handle);
    };
  }, [open, query, endpoint]);

  const scrubSearchParam = React.useCallback(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    if (!p.has("search")) return;

    p.delete("search");
    const qs = p.toString();
    const url = qs
      ? `${window.location.pathname}?${qs}`
      : window.location.pathname;

    // Synchronous, no rerender needed, no race with router.push
    window.history.replaceState(null, "", url);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    scrubSearchParam(); // ← cleans current entry synchronously
    requestAnimationFrame(() => router.push(href));
  };

  const Input = (
    <CommandInput
      ref={inputRef as unknown as React.RefObject<HTMLInputElement>}
      placeholder={placeholder}
      value={query}
      onValueChange={setQuery}
      onKeyDown={(e) => {
        if (e.key === "Tab" && !e.shiftKey) {
          const firstItem =
            listRef.current?.querySelector<HTMLElement>("[cmdk-item]");
          if (firstItem) {
            e.preventDefault();
            firstItem.focus(); // now ↑/↓/Enter work as usual
          }
        }
      }}
    />
  );

  const List = (
    <CommandList ref={listRef}>
      {loading && (
        <div className="text-muted-foreground flex items-center gap-2 p-3 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Searching…
        </div>
      )}
      {!loading &&
        query.trim().length >= MIN_CHARS &&
        data.vehicles.length === 0 &&
        data.clients.length === 0 && (
          <CommandEmpty>No results found.</CommandEmpty>
        )}

      {data.vehicles.length > 0 && (
        <CommandGroup heading="Vehicles">
          {data.vehicles.map((v) => (
            <CommandItem
              key={`veh-${v.id}`}
              value={`${v.identifier} ${v.make} ${v.model}`}
              onSelect={() => go(`/vehicle/${v.id}`)} // ← use plural if that’s your route
            >
              <Car className="mr-2 h-4 w-4" />
              <span className="font-medium">{v.identifier.toUpperCase()}</span>
              <span className="text-muted-foreground ml-2">
                {v.make} {v.model}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      )}

      {data.vehicles.length > 0 && data.clients.length > 0 && (
        <CommandSeparator />
      )}

      {data.clients.length > 0 && (
        <CommandGroup heading="Clients">
          {data.clients.map((c) => {
            const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim();
            const label = c.company_name
              ? name
                ? `${name} • ${c.company_name}`
                : c.company_name
              : name;
            return (
              <CommandItem
                key={`cli-${c.id}`}
                value={`${name} ${c.company_name ?? ""}`}
                onSelect={() => go(`/clients/${c.id}`)}
              >
                <User2 className="mr-2 h-4 w-4" />
                <span className="font-medium">{label || "Unnamed client"}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      )}
    </CommandList>
  );

  if (mode === "popover") {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {trigger ?? (
            <Button
              type="button"
              variant="outline"
              className="inline-flex h-9 items-center gap-2"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search…</span>
              <span className="sr-only">Open search</span>
            </Button>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-[540px] max-w-[calc(100vw-2rem)] p-0">
          <Command shouldFilter={false} className="w-full">
            {Input}
            {List}
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  // mode === "dialog"
  return (
    <>
      {/* Optional hint button you can place in your UI */}
      {showTrigger && !controlledOpen && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(true)}
          className="inline-flex h-9 items-center gap-2"
          aria-label="Open global search"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Search…</span>
          {enableShortcut && (
            <span className="text-muted-foreground ml-2 hidden items-center gap-1 rounded border px-1.5 py-0.5 text-xs md:flex">
              <Keyboard className="h-3 w-3" /> ⌘K
            </span>
          )}
        </Button>
      )}
      <CommandDialog open={open} onOpenChange={setOpen}>
        {Input}
        {List}
      </CommandDialog>
    </>
  );
}
