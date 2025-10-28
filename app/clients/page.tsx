// // app/clients/page.tsx
// import Link from "next/link";
// import { notFound } from "next/navigation";
// import { SupabaseClient } from "@supabase/supabase-js";
// import { getServerSupabaseClient } from "@/lib/supabaseServer";

// import {
//   Card,
//   CardHeader,
//   CardTitle,
//   CardDescription,
//   CardContent,
// } from "@/components/ui/card";

// import {
//   Breadcrumb,
//   BreadcrumbList,
//   BreadcrumbItem,
//   BreadcrumbLink,
//   BreadcrumbSeparator,
//   BreadcrumbPage,
// } from "@/components/ui/breadcrumb";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";

// // ── types ─────────────────────────────────────────────────────────────────────
// type ClientRow = {
//   id: string;
//   first_name: string | null;
//   last_name: string | null;
//   company_name: string | null;
//   email: string | null;
//   phone: string | null;
//   created_at: string;
// };

// type AssetCountRow = {
//   client_id: string;
//   asset_count: number;
// };

// type ContractRow = {
//   id: string;
//   client_id: string;
//   monthly_rate: number | null;
//   start_date: string; // YYYY-MM-DD
//   end_date: string | null;
// };

// const fmtGBP = (n: number) =>
//   new Intl.NumberFormat("en-GB", {
//     style: "currency",
//     currency: "GBP",
//     maximumFractionDigits: 2,
//   }).format(n);

// const ymdLocal = (d = new Date()) =>
//   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
//     d.getDate(),
//   ).padStart(2, "0")}`;

// const isActiveOn = (c: ContractRow, isoYmd: string) =>
//   c.start_date <= isoYmd && (!c.end_date || c.end_date >= isoYmd);

// const fullName = (first?: string | null, last?: string | null) =>
//   [first ?? "", last ?? ""].join(" ").trim();

// // ── data fetchers ─────────────────────────────────────────────────────────────
// async function getClients(
//   sb: SupabaseClient,
//   q?: string,
// ): Promise<ClientRow[]> {
//   let query = sb
//     .from("clients")
//     .select("id, first_name, last_name, company_name, email, phone, created_at")
//     .is("deleted_at", null)
//     .order("created_at", { ascending: false });

//   if (q && q.trim()) {
//     const s = `%${q.trim()}%`;
//     // ilike across common fields
//     query = query.or(
//       `first_name.ilike.${s},last_name.ilike.${s},company_name.ilike.${s},email.ilike.${s}`,
//     );
//   }

//   const { data, error } = await query;
//   if (error) throw error;
//   return data ?? [];
// }

// async function getAssetCountsForClients(
//   sb: SupabaseClient,
//   clientIds: string[],
// ): Promise<AssetCountRow[]> {
//   if (clientIds.length === 0) return [];

//   type Row = { client_id: string };

//   const { data, error } = await sb
//     .from("assets")
//     .select("client_id")
//     .in("client_id", clientIds)
//     .is("deleted_at", null)
//     .overrideTypes<Row[], { merge: false }>();

//   if (error) throw error;

//   // Count in memory
//   const counts = new Map<string, number>();
//   for (const r of data ?? []) {
//     counts.set(r.client_id, (counts.get(r.client_id) ?? 0) + 1);
//   }

//   // Emit only for the requested ids (keeps order stable if you want)
//   return clientIds.map((id) => ({
//     client_id: id,
//     asset_count: counts.get(id) ?? 0,
//   }));
// }

// async function getContractsForClients(
//   sb: SupabaseClient,
//   clientIds: string[],
// ): Promise<ContractRow[]> {
//   if (clientIds.length === 0) return [];
//   const { data, error } = await sb
//     .from("storage_contracts")
//     .select("id, client_id, monthly_rate, start_date, end_date")
//     .in("client_id", clientIds)
//     .is("deleted_at", null);
//   if (error) throw error;
//   return (data ?? []) as ContractRow[];
// }

// // ── UI helpers ────────────────────────────────────────────────────────────────
// function ClientNameCell({ c }: { c: ClientRow }) {
//   const name = fullName(c.first_name, c.last_name);
//   const title = name || "Client";
//   return (
//     <div className="flex flex-col">
//       <span className="font-medium">{title}</span>
//       <span className="text-muted-foreground text-xs">
//         {c.company_name || "—"}
//       </span>
//     </div>
//   );
// }

// function ContactCell({ c }: { c: ClientRow }) {
//   return (
//     <div className="flex flex-col">
//       <span className="text-sm">{c.email || "—"}</span>
//       <span className="text-muted-foreground text-xs">{c.phone || "—"}</span>
//     </div>
//   );
// }

// // ── page ──────────────────────────────────────────────────────────────────────
// export default async function ClientsIndexPage({
//   searchParams,
// }: {
//   searchParams?: Promise<{ q?: string }>;
// }) {
//   const sb = await getServerSupabaseClient();
//   const sp = (await searchParams) ?? {};
//   const q = sp.q;

//   // base fetch
//   const clients = await getClients(sb, q);
//   if (!clients) return notFound();

//   const clientIds = clients.map((c) => c.id);
//   const [assetCounts, contracts] = await Promise.all([
//     getAssetCountsForClients(sb, clientIds),
//     getContractsForClients(sb, clientIds),
//   ]);

//   // index for quick lookup
//   const assetCountMap = new Map<string, number>();
//   for (const row of assetCounts)
//     assetCountMap.set(row.client_id, row.asset_count);

//   const today = ymdLocal();

//   const activeContractsByClient = new Map<string, ContractRow[]>();
//   const activeMonthlyByClient = new Map<string, number>();

//   for (const c of contracts) {
//     if (!isActiveOn(c, today)) continue;
//     const arr = activeContractsByClient.get(c.client_id) ?? [];
//     arr.push(c);
//     activeContractsByClient.set(c.client_id, arr);
//     const prev = activeMonthlyByClient.get(c.client_id) ?? 0;
//     activeMonthlyByClient.set(c.client_id, prev + Number(c.monthly_rate ?? 0));
//   }

//   // header stats
//   const totalClients = clients.length;
//   const totalVehicles = assetCounts.reduce((s, r) => s + r.asset_count, 0);
//   const totalActiveContracts = Array.from(
//     activeContractsByClient.values(),
//   ).reduce((s, arr) => s + arr.length, 0);
//   const totalMonthly = Array.from(activeMonthlyByClient.values()).reduce(
//     (s, n) => s + n,
//     0,
//   );

//   return (
//     <div className="flex min-h-[80vh] w-full flex-col px-2 py-8">
//       <div className="mx-auto w-full max-w-6xl">
//         {/* breadcrumbs */}
//         <Breadcrumb className="mb-6">
//           <BreadcrumbList>
//             <BreadcrumbItem>
//               <BreadcrumbLink asChild>
//                 <Link href="/">Dashboard</Link>
//               </BreadcrumbLink>
//             </BreadcrumbItem>
//             <BreadcrumbSeparator />
//             <BreadcrumbItem>
//               <BreadcrumbPage>Clients</BreadcrumbPage>
//             </BreadcrumbItem>
//           </BreadcrumbList>
//         </Breadcrumb>

//         {/* header + stats */}
//         <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
//           <div>
//             <h1 className="text-2xl font-semibold">Clients</h1>
//             <p className="text-muted-foreground text-sm">
//               Overview of your customers and their storage activity.
//             </p>
//           </div>

//           {/* search */}
//           <form
//             className="flex items-center gap-2"
//             action="/clients"
//             method="GET"
//           >
//             <Input
//               name="q"
//               defaultValue={q ?? ""}
//               placeholder="Search name, company or email…"
//               className="w-[260px]"
//             />
//             <Button type="submit" variant="default">
//               Search
//             </Button>
//             {q ? (
//               <Button variant="outline" asChild>
//                 <Link href="/clients">Clear</Link>
//               </Button>
//             ) : null}
//           </form>
//         </div>

//         {/* stat cards */}
//         <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
//           <Card>
//             <CardHeader className="pb-2">
//               <CardTitle className="text-base">Total clients</CardTitle>
//               <CardDescription>All active clients</CardDescription>
//             </CardHeader>
//             <CardContent className="text-2xl font-semibold">
//               {totalClients}
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader className="pb-2">
//               <CardTitle className="text-base">Vehicles</CardTitle>
//               <CardDescription>Across all clients</CardDescription>
//             </CardHeader>
//             <CardContent className="text-2xl font-semibold">
//               {totalVehicles}
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader className="pb-2">
//               <CardTitle className="text-base">Active contracts</CardTitle>
//               <CardDescription>Currently running</CardDescription>
//             </CardHeader>
//             <CardContent className="text-2xl font-semibold">
//               {totalActiveContracts}
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader className="pb-2">
//               <CardTitle className="text-base">Monthly total</CardTitle>
//               <CardDescription>Active contracts (GBP)</CardDescription>
//             </CardHeader>
//             <CardContent className="text-2xl font-semibold">
//               {fmtGBP(totalMonthly)}
//             </CardContent>
//           </Card>
//         </div>

//         <Card>
//           <CardHeader className="pb-2">
//             <CardTitle className="text-base">Client list</CardTitle>
//             <CardDescription>
//               {q ? (
//                 <>
//                   Results for <span className="font-medium">“{q}”</span>
//                 </>
//               ) : (
//                 "All clients"
//               )}
//             </CardDescription>
//           </CardHeader>

//           <CardContent>
//             <div className="rounded-md border">
//               <Table>
//                 <TableHeader>
//                   <TableRow>
//                     <TableHead className="w-[28%]">Client</TableHead>
//                     <TableHead className="w-[22%]">Contact</TableHead>
//                     <TableHead className="w-[10%]">Vehicles</TableHead>
//                     <TableHead className="w-[14%]">Active contracts</TableHead>
//                     <TableHead className="w-[14%]">Active £/mo</TableHead>
//                     <TableHead className="w-[12%]">Created</TableHead>
//                     <TableHead className="w-[10%] text-right">
//                       Actions
//                     </TableHead>
//                   </TableRow>
//                 </TableHeader>

//                 <TableBody>
//                   {clients.length === 0 ? (
//                     <TableRow>
//                       <TableCell
//                         colSpan={7}
//                         className="text-muted-foreground text-center text-sm"
//                       >
//                         No clients found.
//                       </TableCell>
//                     </TableRow>
//                   ) : (
//                     clients.map((c) => {
//                       const vehicles = assetCountMap.get(c.id) ?? 0;
//                       const activeContracts =
//                         activeContractsByClient.get(c.id) ?? [];
//                       const activeMonthly =
//                         activeMonthlyByClient.get(c.id) ?? 0;

//                       return (
//                         <TableRow key={c.id} className="align-top">
//                           <TableCell>
//                             <ClientNameCell c={c} />
//                           </TableCell>
//                           <TableCell>
//                             <ContactCell c={c} />
//                           </TableCell>
//                           <TableCell>
//                             <div className="flex items-center gap-2">
//                               <Badge variant="secondary">{vehicles}</Badge>
//                             </div>
//                           </TableCell>
//                           <TableCell>
//                             <div className="flex items-center gap-2">
//                               <Badge
//                                 variant={
//                                   activeContracts.length > 0
//                                     ? "default"
//                                     : "secondary"
//                                 }
//                               >
//                                 {activeContracts.length}
//                               </Badge>
//                             </div>
//                           </TableCell>
//                           <TableCell>
//                             {activeContracts.length > 0
//                               ? fmtGBP(activeMonthly)
//                               : "—"}
//                           </TableCell>
//                           <TableCell>
//                             {new Date(c.created_at).toLocaleDateString("en-GB")}
//                           </TableCell>
//                           <TableCell className="text-right">
//                             <Button asChild size="sm" variant="outline">
//                               <Link href={`/clients/${c.id}`}>Open</Link>
//                             </Button>
//                           </TableCell>
//                         </TableRow>
//                       );
//                     })
//                   )}
//                 </TableBody>
//               </Table>
//             </div>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// }

// app/clients/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabaseClient } from "@/lib/supabaseServer";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { ClientsInteractiveTable } from "@/components/client/ClientsInteractiveTable";

// ── types ─────────────────────────────────────────────────────────────────────
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

type ContractRow = {
  id: string;
  client_id: string;
  monthly_rate: number | null;
  start_date: string; // YYYY-MM-DD
  end_date: string | null;
};

// ── utils ─────────────────────────────────────────────────────────────────────
const fmtGBP = (n: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(n);

const ymdLocal = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

const isActiveOn = (c: ContractRow, isoYmd: string) =>
  c.start_date <= isoYmd && (!c.end_date || c.end_date >= isoYmd);

// ── data fetchers ─────────────────────────────────────────────────────────────
async function getClients(
  sb: SupabaseClient,
  q?: string,
): Promise<ClientRow[]> {
  let query = sb
    .from("clients")
    .select("id, first_name, last_name, company_name, email, phone, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (q && q.trim()) {
    const s = `%${q.trim()}%`;
    // ilike across common fields
    query = query.or(
      `first_name.ilike.${s},last_name.ilike.${s},company_name.ilike.${s},email.ilike.${s}`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

async function getAssetCountsForClients(
  sb: SupabaseClient,
  clientIds: string[],
): Promise<AssetCountRow[]> {
  if (clientIds.length === 0) return [];

  type Row = { client_id: string };

  const { data, error } = await sb
    .from("assets")
    .select("client_id")
    .in("client_id", clientIds)
    .is("deleted_at", null)
    .overrideTypes<Row[], { merge: false }>();

  if (error) throw error;

  // Count in memory
  const counts = new Map<string, number>();
  for (const r of data ?? []) {
    counts.set(r.client_id, (counts.get(r.client_id) ?? 0) + 1);
  }

  // Emit only for the requested ids (keeps order stable)
  return clientIds.map((id) => ({
    client_id: id,
    asset_count: counts.get(id) ?? 0,
  }));
}

async function getContractsForClients(
  sb: SupabaseClient,
  clientIds: string[],
): Promise<ContractRow[]> {
  if (clientIds.length === 0) return [];
  const { data, error } = await sb
    .from("storage_contracts")
    .select("id, client_id, monthly_rate, start_date, end_date")
    .in("client_id", clientIds)
    .is("deleted_at", null);
  if (error) throw error;
  return (data ?? []) as ContractRow[];
}

// ── page (server) ─────────────────────────────────────────────────────────────
export default async function ClientsIndexPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const sb = await getServerSupabaseClient();
  const sp = (await searchParams) ?? {};
  const q = sp.q;

  // base fetch (kept as-is)
  const clients = await getClients(sb, q);
  if (!clients) return notFound();

  const clientIds = clients.map((c) => c.id);
  const [assetCounts, contracts] = await Promise.all([
    getAssetCountsForClients(sb, clientIds),
    getContractsForClients(sb, clientIds),
  ]);

  // Build server-side maps for stats + convert to serialisable arrays for client table
  const today = ymdLocal();

  const activeContractsByClient = new Map<string, ContractRow[]>();
  const activeMonthlyByClient = new Map<string, number>();

  for (const c of contracts) {
    if (!isActiveOn(c, today)) continue;
    const arr = activeContractsByClient.get(c.client_id) ?? [];
    arr.push(c);
    activeContractsByClient.set(c.client_id, arr);
    const prev = activeMonthlyByClient.get(c.client_id) ?? 0;
    activeMonthlyByClient.set(c.client_id, prev + Number(c.monthly_rate ?? 0));
  }

  // header stats
  const totalClients = clients.length;
  const totalVehicles = assetCounts.reduce((s, r) => s + r.asset_count, 0);
  const totalActiveContracts = Array.from(
    activeContractsByClient.values(),
  ).reduce((s, arr) => s + arr.length, 0);
  const totalMonthly = Array.from(activeMonthlyByClient.values()).reduce(
    (s, n) => s + n,
    0,
  );

  // Serialisable props for the client-side table
  const activeCounts: { client_id: string; count: number }[] = Array.from(
    activeContractsByClient.entries(),
  ).map(([client_id, arr]) => ({ client_id, count: arr.length }));

  const activeMonthly: { client_id: string; monthly: number }[] = Array.from(
    activeMonthlyByClient.entries(),
  ).map(([client_id, monthly]) => ({ client_id, monthly }));

  return (
    <div className="flex min-h-[80vh] w-full flex-col px-2 py-8">
      <div className="mx-auto w-full max-w-6xl">
        {/* breadcrumbs */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Clients</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* header + stats */}
        <div className="mb-4">
          <h1 className="text-2xl font-semibold">Clients</h1>
          <p className="text-muted-foreground text-sm">
            Overview of your customers and their storage activity.
          </p>
        </div>

        {/* stat cards */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Total clients</CardTitle>
              <CardDescription>All active clients</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {totalClients}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Vehicles</CardTitle>
              <CardDescription>Across all clients</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {totalVehicles}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Active contracts</CardTitle>
              <CardDescription>Currently running</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {totalActiveContracts}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Monthly total</CardTitle>
              <CardDescription>Active contracts (GBP)</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {fmtGBP(totalMonthly)}
            </CardContent>
          </Card>
        </div>

        {/* client list */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Client list</CardTitle>
            <CardDescription>
              Search, filter, sort, and paginate.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Controls + table (client-side) */}
            <ClientsInteractiveTable
              clients={clients}
              assetCounts={assetCounts}
              activeCounts={activeCounts}
              activeMonthly={activeMonthly}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
