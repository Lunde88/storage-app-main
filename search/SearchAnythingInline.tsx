"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
  CommandSeparator,
} from "@/components/ui/command";
import { Car, User2, Loader2 } from "lucide-react";

type Vehicle = { id: string; identifier: string; make: string; model: string };
type Client = {
  id: string;
  first_name: string;
  last_name: string;
  company_name?: string | null;
};
type SearchResult = { vehicles: Vehicle[]; clients: Client[] };

const INITIAL_RESULTS = { vehicles: [], clients: [] } satisfies SearchResult;

export default function SearchAnythingInline({
  endpoint = "/api/search",
}: {
  endpoint?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<SearchResult>(INITIAL_RESULTS);

  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setQuery("");
        setData({ vehicles: [], clients: [] });
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useEffect(() => {
    const handle = setTimeout(async () => {
      const q = query.trim();
      if (q.length < 2) {
        setData(INITIAL_RESULTS);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`${endpoint}?q=${encodeURIComponent(q)}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Search failed");
        const json = (await res.json()) as SearchResult;
        setData(json);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query, endpoint]);

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <Command shouldFilter={false} className="rounded-md border">
        <div className="relative">
          <CommandInput
            placeholder="Search vehicles or clients…"
            value={query}
            onValueChange={setQuery}
            className="pr-8" // add padding for the button
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setData({ vehicles: [], clients: [] });
              }}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </Command>

      {/* Floating results */}
      {query.trim().length >= 2 && (
        <div className="absolute top-full right-0 left-0 z-50 mt-1">
          <Command className="bg-background rounded-md border shadow-md">
            <CommandList>
              {loading && (
                <div className="text-muted-foreground flex items-center gap-2 p-3 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Searching…
                </div>
              )}

              {!loading &&
                data.vehicles.length === 0 &&
                data.clients.length === 0 && (
                  <CommandEmpty>No results found.</CommandEmpty>
                )}

              {data.vehicles.length > 0 && (
                <CommandGroup heading="Vehicles">
                  {data.vehicles.map((v) => (
                    <CommandItem
                      key={v.id}
                      onSelect={() => router.push(`/vehicle/${v.id}`)}
                    >
                      <Car className="mr-2 h-4 w-4" />
                      <span className="font-medium">
                        {v.identifier.toUpperCase()}
                      </span>
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
                    const name =
                      `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim();
                    return (
                      <CommandItem
                        key={c.id}
                        onSelect={() => router.push(`/clients/${c.id}`)}
                      >
                        <User2 className="mr-2 h-4 w-4" />
                        <span className="font-medium">
                          {name || c.company_name || "Unnamed client"}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
