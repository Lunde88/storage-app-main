// export default async function ClientDetailsPage({
//   params,
// }: {
//   params: Promise<{ id: string }>;
// }) {
//   // Access the id from the route
//   const { id } = await params;
//   return (
//     <div className="flex flex-col items-center gap-5 md:flex-row md:items-start">
//       <span className="uppercase">CLIENT DETAILS PAGE: {id}</span>
//     </div>
//   );
// }

// app/clients/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabaseClient } from "@/lib/supabaseServer";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// ── Types (joins can be single object OR array from PostgREST) ─────────────────
type ClientRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
};

type AssetBrief =
  | { id: string; identifier: string | null }
  | { id: string; identifier: string | null }[]
  | null;

type LocationBrief =
  | { id: string; name: string | null }
  | { id: string; name: string | null }[]
  | null;

type ZoneBrief =
  | { id: string; name: string | null; floor: string | null }
  | { id: string; name: string | null; floor: string | null }[]
  | null;

type ContractRow = {
  id: string;
  assetId: string;
  client_id: string;
  monthlyRate: number;
  startDate: string; // YYYY-MM-DD
  endDate: string | null;
  location: LocationBrief;
  zone: ZoneBrief;
  asset: AssetBrief;
};

type MovementFeedRow = {
  id: string;
  asset_id: string;
  event_type: "check-in" | "check-out" | "transfer";
  movement_time: string; // timestamp
  to_location_id: string | null;
  from_location_id: string | null;
  to_location: LocationBrief;
  from_location: LocationBrief;
  to_zone: ZoneBrief;
  from_zone: ZoneBrief;
  asset: AssetBrief;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const ymdLocal = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

const isActiveOn = (
  c: { startDate: string; endDate?: string | null },
  t: string,
) => c.startDate <= t && (!c.endDate || c.endDate >= t);

const endsOn = (c: { endDate?: string | null }, t: string) =>
  !!c.endDate && c.endDate === t;

const isCheckedInLatest = (eventType: MovementFeedRow["event_type"]) =>
  eventType === "check-in" || eventType === "transfer";

const fmtGBP = (n: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(n);

function formatMovementDateUK(iso: string) {
  const d = new Date(iso);
  const dateStr = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    timeZone: "Europe/London",
  }).format(d);
  const timeStr = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/London",
  }).format(d);
  return `${dateStr} at ${timeStr}`;
}

const first = <T,>(x: T | T[] | null | undefined): T | null =>
  Array.isArray(x) ? (x[0] ?? null) : (x ?? null);

// ── Fetchers ──────────────────────────────────────────────────────────────────
async function getClient(
  supabase: SupabaseClient,
  id: string,
): Promise<ClientRow | null> {
  const { data, error } = await supabase
    .from("clients")
    .select("id, first_name, last_name, company_name, email, phone, created_at")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

async function getClientAssets(
  supabase: SupabaseClient,
  clientId: string,
): Promise<{ id: string; identifier: string | null }[]> {
  const { data, error } = await supabase
    .from("assets")
    .select("id, identifier")
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as { id: string; identifier: string | null }[];
}

async function getClientContracts(
  supabase: SupabaseClient,
  clientId: string,
): Promise<ContractRow[]> {
  const { data, error } = await supabase
    .from("storage_contracts")
    .select(
      `
      id,
      assetId:asset_id,
      client_id,
      monthlyRate:monthly_rate,
      startDate:start_date,
      endDate:end_date,
      location:locations!storage_contracts_location_fk ( id, name ),
      zone:location_zones!storage_contracts_location_zone_fk ( id, name, floor ),
      asset:assets!storage_contracts_asset_fk ( id, identifier )
    `,
    )
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .order("start_date", { ascending: false })
    .overrideTypes<ContractRow[], { merge: false }>();
  if (error) throw error;
  return data ?? [];
}

// newest first; keep modest size
async function getRecentMovementsForAssets(
  supabase: SupabaseClient,
  assetIds: string[],
): Promise<MovementFeedRow[]> {
  if (assetIds.length === 0) return [];
  const { data, error } = await supabase
    .from("asset_movements")
    .select(
      `
      id,
      asset_id,
      event_type,
      movement_time,
      to_location_id,
      from_location_id,
      to_location:locations!asset_movements_to_location_fk ( id, name ),
      from_location:locations!asset_movements_from_location_fk ( id, name ),
      to_zone:location_zones!asset_movements_to_location_zone_fk ( id, name ),
      from_zone:location_zones!asset_movements_from_location_zone_fk ( id, name ),
      asset:assets!asset_movements_asset_fk ( id, identifier )
    `,
    )
    .in("asset_id", assetIds)
    .is("deleted_at", null)
    .order("movement_time", { ascending: false })
    .order("id", { ascending: false })
    .limit(30)
    .overrideTypes<MovementFeedRow[], { merge: false }>();
  if (error) throw error;
  return data ?? [];
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function ClientDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await getServerSupabaseClient();
  const { id } = await params;

  // Fetch base data
  const client = await getClient(supabase, id);
  if (!client) return notFound();

  const assets = await getClientAssets(supabase, id);
  const assetIds = assets.map((a) => a.id);

  const [contracts, movements] = await Promise.all([
    getClientContracts(supabase, id),
    getRecentMovementsForAssets(supabase, assetIds),
  ]);

  // Derive stats
  const today = ymdLocal();
  const activeContracts = contracts.filter((c) =>
    isActiveOn({ startDate: c.startDate, endDate: c.endDate }, today),
  );
  const activeMonthlyTotal = activeContracts.reduce(
    (sum, c) => sum + Number(c.monthlyRate || 0),
    0,
  );

  // “Currently checked in” per asset: derive from the latest movement we have
  const latestByAsset = new Map<string, MovementFeedRow>();
  for (const m of movements) {
    if (!latestByAsset.has(m.asset_id)) {
      latestByAsset.set(m.asset_id, m);
    }
  }
  const checkedInAssets = assets.filter((a) => {
    const latest = latestByAsset.get(a.id);
    return latest ? isCheckedInLatest(latest.event_type) : false;
  });

  return (
    <div className="flex min-h-[80vh] w-full flex-col items-center px-2 py-8">
      <div className="w-full max-w-3xl">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/clients">Clients</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>
                {client.first_name || client.last_name ? (
                  <>
                    {client.first_name ?? ""} {client.last_name ?? ""}
                    {client.company_name && (
                      <span className="text-muted-foreground">
                        {" "}
                        ({client.company_name})
                      </span>
                    )}
                  </>
                ) : (
                  (client.company_name ?? "Client")
                )}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {client.first_name || client.last_name ? (
                <>
                  {client.first_name ?? ""} {client.last_name ?? ""}
                </>
              ) : (
                "Client"
              )}
            </CardTitle>
            <CardDescription>
              {client.company_name ? client.company_name : "—"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Client info */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="border-muted">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Contact</CardTitle>
                  <CardDescription>
                    {client.email || client.phone
                      ? "Details"
                      : "No contact on file"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  <div>
                    Email:{" "}
                    {client.email ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                  <div>
                    Phone:{" "}
                    {client.phone ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-muted">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Contracts</CardTitle>
                  <CardDescription>
                    Active: {activeContracts.length} ·{" "}
                    {fmtGBP(activeMonthlyTotal)}/mo
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  <div>Total vehicles: {assets.length}</div>
                  <div>
                    Checked in: {checkedInAssets.length}/{assets.length}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator className="my-4" />

            {/* Active contracts list */}
            <div className="mb-2 font-semibold">Active contracts</div>
            {activeContracts.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                No active contracts.
              </div>
            ) : (
              <ul className="space-y-3">
                {activeContracts.map((c) => {
                  const loc = first(c.location);
                  const zn = first(c.zone);
                  const a = first(c.asset);

                  return (
                    <li key={c.id} className="rounded border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-sm">
                            <span className="font-medium">
                              {fmtGBP(Number(c.monthlyRate))}
                            </span>{" "}
                            / month
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {new Date(c.startDate).toLocaleDateString("en-GB")}{" "}
                            →{" "}
                            {c.endDate
                              ? new Date(c.endDate).toLocaleDateString("en-GB")
                              : "open-ended"}
                            {" · "}
                            {a?.identifier
                              ? a.identifier.toUpperCase()
                              : "(vehicle)"}{" "}
                            {" · "}
                            {loc?.name ?? "Unassigned"}
                            {zn?.name ? ` — ${zn.name}` : ""}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Ends today badge */}
                          {endsOn({ endDate: c.endDate }, today) && (
                            <span className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                              Ends today
                            </span>
                          )}

                          {a?.id && (
                            <Link
                              className="text-sm underline underline-offset-4"
                              href={`/vehicle/${a.id}/contracts`}
                            >
                              View vehicle contracts →
                            </Link>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <Separator className="my-4" />

            {/* Currently checked-in vehicles */}
            <div className="mb-2 font-semibold">Currently checked in</div>
            {checkedInAssets.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                No vehicles are currently checked in.
              </div>
            ) : (
              <ul className="space-y-2">
                {checkedInAssets.map((a) => {
                  const idLabel = a.identifier?.toUpperCase() ?? "(unlabelled)";
                  return (
                    <li key={a.id} className="rounded border p-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="uppercase">{idLabel}</span>
                        <Link
                          href={`/vehicle/${a.id}`}
                          className="text-sm underline underline-offset-4"
                        >
                          Open vehicle →
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <Separator className="my-4" />

            {/* Recent movements */}
            <div className="mb-2 font-semibold">Recent movements</div>
            {movements.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                No movements yet.
              </div>
            ) : (
              <ul className="space-y-3">
                {movements.map((m) => {
                  const a = first(m.asset);
                  const toLoc = first(m.to_location);
                  const fromLoc = first(m.from_location);
                  const toZone = first(m.to_zone);
                  const fromZone = first(m.from_zone);

                  const fromLabel = fromLoc?.name
                    ? `${fromLoc.name}${fromZone?.name ? ` — ${fromZone.name}` : ""}`
                    : m.from_location_id
                      ? `(${m.from_location_id.slice(0, 8)})`
                      : "—";

                  const toLabel = toLoc?.name
                    ? `${toLoc.name}${toZone?.name ? ` — ${toZone.name}` : ""}`
                    : m.to_location_id
                      ? `(${m.to_location_id.slice(0, 8)})`
                      : "—";

                  let line: string;
                  switch (m.event_type) {
                    case "check-in":
                      line = `Checked in to ${toLabel}`;
                      break;
                    case "transfer":
                      line = `Transferred from ${fromLabel} to ${toLabel}`;
                      break;
                    case "check-out":
                    default:
                      line = `Checked out from ${fromLabel}`;
                      break;
                  }

                  return (
                    <li key={m.id} className="rounded border p-3">
                      <div className="flex flex-wrap items-center gap-x-2 text-sm">
                        <span className="font-medium uppercase">
                          {a?.identifier ?? "(vehicle)"}
                        </span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">
                          {formatMovementDateUK(m.movement_time)}
                        </span>
                      </div>
                      <div className="text-sm">{line}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
