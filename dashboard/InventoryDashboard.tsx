"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import DesktopFilter from "./DesktopFilter"; // update path if needed
import { CircleUserRound, Ellipsis } from "lucide-react";
import { Button } from "../ui/button";
import CardDivider from "../base/card/CardDivider";
import { LocationDetails } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import MobileFilter from "./MobileFilter";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

type DashboardLocation = Pick<LocationDetails, "id" | "name">;

type Asset = {
  id: string;
  identifier: string;
  make: string;
  model: string;
  colour?: string;
  year?: number;
  location: { name: string };
  client: { label: string };
  lastEventType: "check-in" | "check-out" | "transfer" | null;
  lastMovementTime: string | null;
};

type ApiError = { error: string; code?: string; details?: unknown };

type AssetsResponse = {
  assets: Asset[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    order: "asc" | "desc";
    location: string | null;
  };
};

type InventoryDashboardProps = {
  locations: DashboardLocation[];
};

async function jsonFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    let body: ApiError | undefined;
    try {
      body = await res.json();
    } catch {
      /* ignore */
    }
    const msg = body?.error ?? `${res.status} ${res.statusText}`;
    const err = new Error(msg) as Error & {
      status?: number;
      details?: unknown;
    };
    err.status = res.status;
    err.details = body?.details;
    throw err;
  }
  return res.json() as Promise<T>;
}

export default function InventoryDashboard({
  locations,
}: InventoryDashboardProps) {
  const searchParams = useSearchParams();
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [page, setPage] = useState(1);
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  // On first mount only, read from ?location=
  useEffect(() => {
    const initial = searchParams.get("location") || "";
    setSelectedLocation(initial);
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset page when location/order changes
  useEffect(() => {
    setPage(1);
  }, [selectedLocation, order]);

  // Build the API URL with query params
  const params = new URLSearchParams();
  if (selectedLocation) params.set("location", selectedLocation); // omit if empty => backend treats as "all"
  params.set("order", order);
  params.set("page", String(page));
  params.set("pageSize", "9");

  const apiUrl = `/api/assets?${params.toString()}`;

  // Optional: skip until initial query param is read
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const initial = searchParams.get("location") || "";
    setSelectedLocation(initial);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const swrKey = ready ? apiUrl : null; // SWR won't fetch on null

  const { data, isLoading, isValidating, error, mutate } =
    useSWR<AssetsResponse>(swrKey, jsonFetcher, { keepPreviousData: true });
  const assets = data?.assets ?? [];
  const count = data?.meta.total ?? 0;

  // Manual refresh spinner
  const handleRefresh = () => {
    setOrder("desc"); // or whatever your default is
    setPage(1);
    mutate();
  };

  return (
    <div className="flex-1">
      <DesktopFilter
        locations={locations}
        selectedLocation={selectedLocation}
        onLocationChange={setSelectedLocation}
        order={order}
        onOrderChange={(val) => setOrder(val as "asc" | "desc")}
        page={page}
        onPageChange={setPage}
        totalCount={count}
        onRefresh={handleRefresh}
        isLoading={isValidating}
      />
      <MobileFilter
        locations={locations}
        selectedLocation={selectedLocation}
        onLocationChange={setSelectedLocation}
        order={order}
        onOrderChange={(val) => setOrder(val as "asc" | "desc")}
        page={page}
        onPageChange={setPage}
        totalCount={count}
        onRefresh={handleRefresh}
        isLoading={isValidating}
      />

      <div className="shadow-regular w-full rounded-[12px] bg-white p-3">
        <h1 className="font-heading pb-3 text-xl font-semibold">Inventory</h1>
        {!data && isLoading ? (
          <div className="py-8 text-center">Loading…</div>
        ) : error ? (
          <div className="text-red-600">Error loading assets.</div>
        ) : assets.length === 0 ? (
          <div className="py-8 text-center">No assets found.</div>
        ) : (
          // <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div className="grid [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))] gap-3">
            {assets.map((asset) => (
              <Link
                key={asset.id}
                href={`/vehicle/${asset.id}`}
                className="w-full space-y-2 rounded-md bg-[#FAFAFA] p-3 transition-colors hover:bg-[#F5F5F5] focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <div className="flex justify-between">
                  <div className="space-y-1">
                    <span className="font-heading inline-block rounded-sm border border-[#5C5757] bg-[#FFFDE1] px-2 py-1 text-sm font-semibold">
                      {asset.identifier.toUpperCase()}
                    </span>
                    <div className="flex items-center">
                      <p className="mb-0 font-medium">
                        {asset.make} {asset.model}
                      </p>
                      <span className="ml-2 text-xs font-normal">
                        {asset.year} | {asset.colour}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <CircleUserRound className="!h-5 !w-5" />
                      <p className="text-xs capitalize">
                        {asset.client?.label}
                      </p>
                    </div>
                  </div>
                  {/* <Button
                    size="icon"
                    variant="outline"
                    className="h-12 w-12 rounded-[8px] bg-transparent shadow-none"
                    aria-haspopup="menu"
                    aria-label="Open actions"
                    onClick={(e) => {
                      e.preventDefault(); // prevent Link navigation
                      e.stopPropagation(); // stop event bubbling
                      // TODO: open your popover/menu here
                    }}
                  >
                    <Ellipsis className="!h-6 !w-6" />
                  </Button> */}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-12 w-12 rounded-[8px] bg-transparent shadow-none"
                        aria-haspopup="menu"
                        aria-label="Open actions"
                        onClick={(e) => {
                          // Prevent the parent <Link> from navigating
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onPointerDown={(e) => {
                          // Extra safety: some browsers trigger on pointer down inside links
                          e.stopPropagation();
                        }}
                      >
                        <Ellipsis className="!h-6 !w-6" />
                      </Button>
                    </DropdownMenuTrigger>

                    {/* Stop clicks inside the menu from bubbling up to the card link */}
                    <DropdownMenuContent
                      align="end"
                      sideOffset={8}
                      className="min-w-[180px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />

                      <DropdownMenuItem asChild>
                        <Link
                          href={`/vehicle/${asset.id}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Open vehicle
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild>
                        <Link
                          href={`/vehicle/${asset.id}/contracts`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          View contracts
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardDivider />
                <div className="flex justify-between text-xs">
                  <span className="font-semibold">
                    {asset.lastEventType
                      ? asset.lastEventType === "check-in"
                        ? "Last checked in:"
                        : asset.lastEventType === "check-out"
                          ? "Last checked out:"
                          : "Last moved:"
                      : "No movements yet"}
                  </span>

                  <span>
                    {asset.lastMovementTime
                      ? (() => {
                          const d = new Date(asset.lastMovementTime);
                          const date = new Intl.DateTimeFormat("en-GB", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                            timeZone: "Europe/London",
                          })
                            .format(d)
                            .replace(/\//g, "-");
                          const time = new Intl.DateTimeFormat("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                            timeZone: "Europe/London",
                          }).format(d);
                          return `${date} | ${time}`;
                        })()
                      : "—"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
