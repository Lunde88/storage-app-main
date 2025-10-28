"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import Link from "next/link";

type ClientRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
};

type AssetCountRow = {
  client_id: string;
  asset_count: number;
};

const fullName = (first?: string | null, last?: string | null) =>
  [first ?? "", last ?? ""].join(" ").trim();

function ClientNameCell({ c }: { c: ClientRow }) {
  const name = fullName(c.first_name, c.last_name);
  const title = name || "Client";
  return (
    <div className="flex flex-col">
      <span className="font-medium">{title}</span>
      <span className="text-muted-foreground text-xs">
        {c.company_name || "—"}
      </span>
    </div>
  );
}

const fmtGBP = (n: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(n);

function ContactCell({ c }: { c: ClientRow }) {
  return (
    <div className="flex flex-col">
      <span className="text-sm">{c.email || "—"}</span>
      <span className="text-muted-foreground text-xs">{c.phone || "—"}</span>
    </div>
  );
}

export function ClientsInteractiveTable(props: {
  clients: ClientRow[];
  assetCounts: AssetCountRow[];
  activeCounts: { client_id: string; count: number }[];
  activeMonthly: { client_id: string; monthly: number }[];
}) {
  const { clients, assetCounts, activeCounts, activeMonthly } = props;

  // Build lookup maps on the client
  const assetCountMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of assetCounts) m.set(r.client_id, r.asset_count);
    return m;
  }, [assetCounts]);

  const activeCountMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of activeCounts) m.set(r.client_id, r.count);
    return m;
  }, [activeCounts]);

  const activeMonthlyMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of activeMonthly) m.set(r.client_id, r.monthly);
    return m;
  }, [activeMonthly]);

  // Controls state
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "none">(
    "all",
  );
  const [vehicleFilter, setVehicleFilter] = useState<
    "all" | "zero" | "onePlus" | "fivePlus"
  >("all");
  const [orderBy, setOrderBy] = useState<
    "created_desc" | "name_asc" | "company_asc" | "activeMonthly_desc"
  >("created_desc");
  const [pageSize, setPageSize] = useState<"10" | "25" | "50">("25");
  const [page, setPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Derived rows
  const filtered = useMemo(() => {
    let rows = clients.slice();

    // search across name/company/email
    if (debouncedQ) {
      const term = debouncedQ.toLowerCase();
      rows = rows.filter((c) => {
        const name = fullName(c.first_name, c.last_name).toLowerCase();
        const company = (c.company_name ?? "").toLowerCase();
        const email = (c.email ?? "").toLowerCase();
        return (
          name.includes(term) || company.includes(term) || email.includes(term)
        );
      });
    }

    // active contracts filter
    if (activeFilter !== "all") {
      rows = rows.filter((c) => {
        const count = activeCountMap.get(c.id) ?? 0;
        return activeFilter === "active" ? count > 0 : count === 0;
      });
    }

    // vehicle count filter
    if (vehicleFilter !== "all") {
      rows = rows.filter((c) => {
        const v = assetCountMap.get(c.id) ?? 0;
        if (vehicleFilter === "zero") return v === 0;
        if (vehicleFilter === "onePlus") return v >= 1;
        return v >= 5; // fivePlus
      });
    }

    // ordering
    rows.sort((a, b) => {
      switch (orderBy) {
        case "name_asc": {
          const an = fullName(a.first_name, a.last_name).toLowerCase();
          const bn = fullName(b.first_name, b.last_name).toLowerCase();
          return an.localeCompare(bn);
        }
        case "company_asc": {
          const ac = (a.company_name ?? "").toLowerCase();
          const bc = (b.company_name ?? "").toLowerCase();
          return ac.localeCompare(bc);
        }
        case "activeMonthly_desc": {
          const am = activeMonthlyMap.get(a.id) ?? 0;
          const bm = activeMonthlyMap.get(b.id) ?? 0;
          return bm - am;
        }
        case "created_desc":
        default:
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });

    return rows;
  }, [
    clients,
    debouncedQ,
    activeFilter,
    vehicleFilter,
    orderBy,
    activeCountMap,
    assetCountMap,
    activeMonthlyMap,
  ]);

  // pagination
  const pageSizeNum = Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSizeNum));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSizeNum;
  const pageRows = filtered.slice(start, start + pageSizeNum);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedQ, activeFilter, vehicleFilter, orderBy, pageSize]);

  return (
    <div className="space-y-3">
      {/* Controls row */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Input
              className="w-[240px]"
              placeholder="Search name, company, email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search clients"
              autoComplete="false"
            />
          </div>

          <Select
            value={activeFilter}
            onValueChange={(v: "all" | "active" | "none") => setActiveFilter(v)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Active contracts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All contracts</SelectItem>
              <SelectItem value="active">Active only</SelectItem>
              <SelectItem value="none">No active</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={vehicleFilter}
            onValueChange={(v: "all" | "zero" | "onePlus" | "fivePlus") =>
              setVehicleFilter(v)
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Vehicles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All vehicles</SelectItem>
              <SelectItem value="zero">0 vehicles</SelectItem>
              <SelectItem value="onePlus">1+ vehicles</SelectItem>
              <SelectItem value="fivePlus">5+ vehicles</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={orderBy}
            onValueChange={(
              v:
                | "created_desc"
                | "name_asc"
                | "company_asc"
                | "activeMonthly_desc",
            ) => setOrderBy(v)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Order by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_desc">Newest created</SelectItem>
              <SelectItem value="name_asc">Name (A→Z)</SelectItem>
              <SelectItem value="company_asc">Company (A→Z)</SelectItem>
              <SelectItem value="activeMonthly_desc">
                Active £/mo (high→low)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={pageSize}
            onValueChange={(v: "10" | "25" | "50") => setPageSize(v)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Rows per page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / page</SelectItem>
              <SelectItem value="25">25 / page</SelectItem>
              <SelectItem value="50">50 / page</SelectItem>
            </SelectContent>
          </Select>

          <div className="text-muted-foreground text-xs">
            Page {safePage} of {totalPages}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[28%]">Client</TableHead>
              <TableHead className="w-[22%]">Contact</TableHead>
              <TableHead className="w-[10%]">Vehicles</TableHead>
              <TableHead className="w-[14%]">Active contracts</TableHead>
              <TableHead className="w-[14%]">Active £/mo</TableHead>
              <TableHead className="w-[12%]">Created</TableHead>
              <TableHead className="w-[10%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground text-center text-sm"
                >
                  No clients found.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((c) => {
                const vehicles = assetCountMap.get(c.id) ?? 0;
                const activeContracts = activeCountMap.get(c.id) ?? 0;
                const monthly = activeMonthlyMap.get(c.id) ?? 0;

                return (
                  <TableRow key={c.id} className="align-top">
                    <TableCell>
                      <ClientNameCell c={c} />
                    </TableCell>
                    <TableCell>
                      <ContactCell c={c} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{vehicles}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            activeContracts > 0 ? "default" : "secondary"
                          }
                        >
                          {activeContracts}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {activeContracts > 0 ? fmtGBP(monthly) : "—"}
                    </TableCell>
                    <TableCell>
                      {new Date(c.created_at).toLocaleDateString("en-GB")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/clients/${c.id}`}>Open</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
