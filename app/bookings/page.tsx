// app/bookings/page.tsx
import Link from "next/link";
import { getServerSupabaseClient } from "@/lib/supabaseServer";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  updateBookingStatusAction,
  deleteBookingAction,
  createBookingAction,
} from "@/lib/server-actions/bookings";
import { SupabaseClient } from "@supabase/supabase-js";
import NewBookingForm from "@/components/bookings/NewBookingForm";
import { ServiceOption, ServiceRow } from "@/lib/types";

type AssetRow = { id: string; identifier: string | null };
type ClientRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
};
type LocationRow = { id: string; name: string | null };
type ZoneRow = { id: string; name: string | null; location_id: string };

type BookingRawRow = {
  id: string;
  booking_type: "drop-off" | "pick-up" | "transfer";
  status:
    | "requested"
    | "confirmed"
    | "ready"
    | "in-progress"
    | "completed"
    | "cancelled"
    | "no-show";
  scheduled_start_at: string;
  scheduled_end_at: string | null;
  notes: string | null;
  prep_requested: Record<string, unknown> | null;
  asset: AssetRow[] | null;
  client:
    | {
        id: string;
        first_name: string | null;
        last_name: string | null;
        company_name: string | null;
      }[]
    | null;
  to_location: LocationRow[] | null;
  to_zone: ZoneRow[] | null;
  from_location: LocationRow[] | null;
  from_zone: ZoneRow[] | null;
};

type DbService = {
  id: string;
  service_key: string;
  label: string;
  input_type: "boolean" | "select" | "multiselect" | "text" | "number" | "date";
  options: unknown | null; // raw from DB
};

// ——— helpers (no any) ———
type OptionObj = { value: string; label: string };

function isOptionObj(x: unknown): x is OptionObj {
  if (typeof x !== "object" || x === null) return false;
  const r = x as Record<string, unknown>;
  return typeof r.value === "string" && typeof r.label === "string";
}

function toServiceOptions(raw: unknown): ServiceOption[] {
  if (!Array.isArray(raw)) return [];
  const out: ServiceOption[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      out.push({ value: item, label: item }); // ← convert string → object
    } else if (isOptionObj(item)) {
      out.push({ value: item.value, label: item.label });
    }
  }
  return out;
}

// ——— normaliser (no any) ———
function normaliseService(s: DbService): ServiceRow {
  const base = {
    id: s.id,
    service_key: s.service_key,
    label: s.label,
  } as const;

  if (s.input_type === "select") {
    return {
      ...base,
      input_type: "select",
      options: toServiceOptions(s.options),
    };
  }
  if (s.input_type === "multiselect") {
    return {
      ...base,
      input_type: "multiselect",
      options: toServiceOptions(s.options),
    };
  }

  // non-select types must have options === null
  switch (s.input_type) {
    case "boolean":
      return { ...base, input_type: "boolean", options: null };
    case "text":
      return { ...base, input_type: "text", options: null };
    case "number":
      return { ...base, input_type: "number", options: null };
    case "date":
      return { ...base, input_type: "date", options: null };
    default:
      // safeguard if DB contains an unexpected type
      return { ...base, input_type: "text", options: null };
  }
}

const first = <T,>(v: T[] | null | undefined): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

async function fetchAssets(supabase: SupabaseClient): Promise<AssetRow[]> {
  const { data, error } = await supabase
    .from("assets")
    .select("id, identifier")
    .is("deleted_at", null)
    .order("identifier", { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as AssetRow[];
}

async function fetchClients(supabase: SupabaseClient): Promise<ClientRow[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("id, first_name, last_name, company_name")
    .is("deleted_at", null)
    .order("company_name", { ascending: true })
    .order("last_name", { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as ClientRow[];
}

async function fetchLocationsWithZones(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("locations")
    .select(
      `
      id, name,
      location_zones:location_zones!location_zones_location_fk ( id, name, location_id )
    `,
    )
    .is("deleted_at", null)
    .order("name", { ascending: true })
    .order("name", { foreignTable: "location_zones", ascending: true });
  if (error) throw error;
  return (data ?? []).map((l) => ({
    id: l.id as string,
    name: l.name as string,
    zones: (l.location_zones ?? []) as ZoneRow[],
  })) as { id: string; name: string; zones: ZoneRow[] }[];
}

async function fetchUpcomingBookings(
  supabase: SupabaseClient,
): Promise<BookingRawRow[]> {
  const now = new Date();
  const past = new Date(now);
  past.setDate(past.getDate() - 3);
  const fut = new Date(now);
  fut.setDate(fut.getDate() + 60);

  const { data, error } = await supabase
    .from("asset_bookings")
    .select(
      `
      id, booking_type, status, scheduled_start_at, scheduled_end_at, notes, prep_requested,
      asset:assets!asset_bookings_asset_fk ( id, identifier ),
      client:clients!asset_bookings_client_fk ( id, first_name, last_name, company_name ),
      to_location:locations!asset_bookings_to_loc_fk ( id, name ),
      to_zone:location_zones!asset_bookings_to_zone_fk ( id, name, location_id ),
      from_location:locations!asset_bookings_from_loc_fk ( id, name ),
      from_zone:location_zones!asset_bookings_from_zone_fk ( id, name, location_id )
    `,
    )
    .gte("scheduled_start_at", past.toISOString())
    .lte("scheduled_start_at", fut.toISOString())
    .is("deleted_at", null)
    .order("scheduled_start_at", { ascending: true })
    .overrideTypes<BookingRawRow[], { merge: false }>();
  if (error) throw error;
  return data ?? [];
}

async function fetchPrepServices(
  supabase: SupabaseClient,
): Promise<ServiceRow[]> {
  const { data, error } = await supabase
    .from("prep_services")
    .select("id, service_key, label, input_type, options")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as DbService[];
  return rows.map(normaliseService);
}

function fmtUK(dt: string | null | undefined) {
  if (!dt) return "";
  const d = new Date(dt);
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return `${date} at ${time}`;
}

function fmtRange(start: string, end: string | null) {
  if (!start) return "";
  if (!end) return fmtUK(start);
  // same-day pretty: 04/09/25 at 10:15–11:30
  const s = new Date(start);
  const e = new Date(end);
  const sameDay =
    s.getFullYear() === e.getFullYear() &&
    s.getMonth() === e.getMonth() &&
    s.getDate() === e.getDate();

  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  if (sameDay) {
    const dateStr = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }).format(s);
    return `${dateStr} at ${time.format(s)}–${time.format(e)}`;
  }
  return `${fmtUK(start)} → ${fmtUK(end)}`;
}

function statusClasses(status: BookingRawRow["status"]) {
  switch (status) {
    case "requested":
      return "bg-amber-100 text-amber-900 border-amber-300";
    case "confirmed":
      return "bg-blue-100 text-blue-900 border-blue-300";
    case "ready":
      return "bg-cyan-100 text-cyan-900 border-cyan-300";
    case "in-progress":
      return "bg-purple-100 text-purple-900 border-purple-300";
    case "completed":
      return "bg-emerald-100 text-emerald-900 border-emerald-300";
    case "cancelled":
      return "bg-rose-100 text-rose-900 border-rose-300";
    case "no-show":
      return "bg-zinc-200 text-zinc-900 border-zinc-300";
    default:
      return "bg-zinc-100 text-zinc-900 border-zinc-300";
  }
}

// Build a label/value list from prep_requested using the services dictionary
function renderPrepChips(
  prep: Record<string, unknown> | null | undefined,
  services: ServiceRow[],
) {
  if (!prep || typeof prep !== "object") return null;

  const byKey = new Map<string, ServiceRow>();
  for (const s of services) byKey.set(s.service_key, s);

  const entries: { key: string; label: string; value: string }[] = [];

  for (const [k, raw] of Object.entries(prep)) {
    const svc = byKey.get(k);
    const label = svc?.label ?? k;

    let valueText = "";
    if (Array.isArray(raw)) {
      valueText = raw.join(", ");
    } else if (typeof raw === "boolean") {
      valueText = raw ? "Yes" : "No";
    } else if (raw == null) {
      valueText = "";
    } else {
      valueText = String(raw);
    }

    if (valueText === "") {
      entries.push({ key: k, label, value: "" });
    } else {
      entries.push({ key: k, label, value: valueText });
    }
  }

  if (entries.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {entries.map((e) => (
        <span
          key={e.key}
          className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
        >
          <strong className="text-foreground">{e.label}</strong>
          {e.value ? <span>· {e.value}</span> : null}
        </span>
      ))}
    </div>
  );
}

export default async function BookingsPage() {
  const supabase = await getServerSupabaseClient();

  const [assets, clients, locations, services, bookings] = await Promise.all([
    fetchAssets(supabase),
    fetchClients(supabase),
    fetchLocationsWithZones(supabase),
    fetchPrepServices(supabase),
    fetchUpcomingBookings(supabase),
  ]);

  return (
    <div className="flex min-h-[80vh] w-full flex-col items-center px-2 py-8">
      <div className="w-full max-w-3xl">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Bookings</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Bookings</CardTitle>
            <CardDescription>
              Plan upcoming drop-offs, pick-ups, and transfers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <h3 className="mb-2 text-sm font-semibold tracking-wide">
                Create a booking
              </h3>
              <NewBookingForm
                assets={assets}
                clients={clients}
                locations={locations}
                services={services}
                createAction={createBookingAction}
              />
            </div>

            <Separator className="my-4" />

            <h3 className="mb-2 text-sm font-semibold tracking-wide">
              Upcoming & recent
            </h3>
            {bookings.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                No bookings yet.
              </div>
            ) : (
              <ul className="space-y-3">
                {bookings.map((b) => {
                  const asset = first(b.asset);
                  const client = first(b.client);
                  const toLoc = first(b.to_location);
                  const toZone = first(b.to_zone);
                  const fromLoc = first(b.from_location);
                  const fromZone = first(b.from_zone);

                  const vehicle =
                    asset?.identifier?.toUpperCase() ?? "(vehicle)";
                  const clientName = client
                    ? [client.first_name, client.last_name]
                        .filter(Boolean)
                        .join(" ") ||
                      client.company_name ||
                      "Unknown client"
                    : "Unknown client";

                  const where =
                    b.booking_type === "drop-off"
                      ? [toLoc?.name ?? "Unassigned", toZone?.name]
                          .filter(Boolean)
                          .join(" — ")
                      : b.booking_type === "pick-up"
                        ? [fromLoc?.name ?? "Unassigned", fromZone?.name]
                            .filter(Boolean)
                            .join(" — ")
                        : [
                            [fromLoc?.name ?? "—", fromZone?.name]
                              .filter(Boolean)
                              .join(" — "),
                            [toLoc?.name ?? "—", toZone?.name]
                              .filter(Boolean)
                              .join(" — "),
                          ].join(" → ");

                  return (
                    <li key={b.id} className="rounded border p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          {/* Top line: vehicle · type · time range */}
                          <div className="text-sm font-medium">
                            {vehicle} · {b.booking_type.replace("-", " ")} ·{" "}
                            {fmtRange(b.scheduled_start_at, b.scheduled_end_at)}
                          </div>

                          {/* Second line: client · where · notes */}
                          <div className="text-muted-foreground text-xs">
                            {clientName} · {where}
                            {b.notes ? <> · {b.notes}</> : null}
                          </div>

                          {/* Prep chips */}
                          {renderPrepChips(b.prep_requested, services)}
                        </div>

                        {/* Status badge */}
                        <span
                          className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusClasses(b.status)}`}
                          title={`Status: ${b.status}`}
                        >
                          {b.status}
                        </span>
                      </div>

                      {/* Quick actions */}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <form
                          action={async () => {
                            "use server";
                            await updateBookingStatusAction({
                              id: b.id,
                              status: "confirmed",
                            });
                          }}
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={b.status !== "requested"}
                          >
                            Confirm
                          </Button>
                        </form>

                        <form
                          action={async () => {
                            "use server";
                            await updateBookingStatusAction({
                              id: b.id,
                              status: "completed",
                            });
                          }}
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={
                              !(
                                b.status === "ready" ||
                                b.status === "in-progress" ||
                                b.status === "confirmed"
                              )
                            }
                          >
                            Complete
                          </Button>
                        </form>

                        <form
                          action={async () => {
                            "use server";
                            await updateBookingStatusAction({
                              id: b.id,
                              status: "cancelled",
                            });
                          }}
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={
                              b.status === "cancelled" ||
                              b.status === "completed"
                            }
                          >
                            Cancel
                          </Button>
                        </form>

                        <form action={deleteBookingAction}>
                          <input type="hidden" name="id" value={b.id} />
                          <Button size="sm" variant="destructive">
                            Delete
                          </Button>
                        </form>
                      </div>
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
