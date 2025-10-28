import { notFound } from "next/navigation";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { keysToCamelCase } from "@/utils/case";
import {
  getMovementEventLabel,
  getReportTypeLabel,
  MovementEventType,
} from "@/lib/types";
import { CheckoutVehicleButton } from "@/components/CheckoutVehicleButton";
import { SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabaseClient } from "@/lib/supabaseServer";
import { Car } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";
import { getSignedImageUrl } from "@/lib/storage/getSignedImageUrl";

import { fetchMovementHistoryDirect } from "@/lib/data-fetching/historyFromMovements";

type CurrentLocRow = {
  event_type: "check-in" | "check-out" | "transfer";
  movement_time: string;
  to_location_id: string | null;
  to_location: { id: string; name: string } | null;
  to_location_zone_id: string | null;
  to_zone: { id: string; name: string } | null;
};

// --- Helpers ---
function formatDateUK(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  const dateStr = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    timeZone: "Europe/London",
  }).format(date);
  const timeStr = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/London",
  }).format(date);
  return `${dateStr} at ${timeStr}`;
}

// Fetch helpers...
async function getVehicleAndClient(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("assets")
    .select(
      `
      *,
      client:clients (
        id, first_name, last_name, company_name, email, phone
      ),
       location:locations (
          id, name
        )
    `,
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  return keysToCamelCase(data);
}

async function getCurrentLocation(
  supabase: SupabaseClient,
  assetId: string,
): Promise<{
  hasHistory: boolean;
  isCheckedIn: boolean;
  locationId: string | null;
  locationName: string | null;
  locationZoneId: string | null;
  locationZoneName: string | null;
  eventType: "check-in" | "check-out" | "transfer" | null;
  movementTime: string | null;
}> {
  const { data: m, error } = await supabase
    .from("asset_movements")
    .select(
      `
      event_type,
      movement_time,
      to_location_id,
      to_location:locations!asset_movements_to_location_fk ( id, name ),
      to_location_zone_id,
      to_zone:location_zones!asset_movements_to_location_zone_fk ( id, name )
    `,
    )
    .eq("asset_id", assetId)
    .is("deleted_at", null)
    .order("movement_time", { ascending: false })
    .order("id", { ascending: false }) // tie-breaker
    .limit(1)
    .maybeSingle()
    .overrideTypes<CurrentLocRow | null, { merge: false }>();

  if (error) {
    console.error("getCurrentLocation error:", error);
  }

  const hasHistory = !!m;
  const eventType =
    (m?.event_type as "check-in" | "check-out" | "transfer") ?? null;
  const isCheckedIn = eventType === "check-in" || eventType === "transfer";

  return {
    hasHistory,
    isCheckedIn,
    eventType,
    movementTime: m?.movement_time ?? null,
    locationId: hasHistory && isCheckedIn ? (m?.to_location_id ?? null) : null,
    locationName:
      hasHistory && isCheckedIn ? (m?.to_location?.name ?? null) : null,
    locationZoneId:
      hasHistory && isCheckedIn ? (m?.to_location_zone_id ?? null) : null,
    locationZoneName:
      hasHistory && isCheckedIn ? (m?.to_zone?.name ?? null) : null,
  };
}

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await getServerSupabaseClient();
  const { id } = await params;

  const vehicle = await getVehicleAndClient(supabase, id);
  if (!vehicle) return notFound();

  const current = await getCurrentLocation(supabase, vehicle.id);
  const isCheckedIn = current.isCheckedIn;
  const statusLabel = !current.hasHistory
    ? "Not yet moved"
    : isCheckedIn
      ? "In storage"
      : "Checked out";

  const movements = await fetchMovementHistoryDirect(supabase, vehicle.id);

  // Fetch the most recent check-in report
  const { data: reportRaw } = await supabase
    .from("condition_reports")
    .select("*")
    .eq("asset_id", vehicle.id)
    .eq("status", "submitted")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const report = reportRaw ? keysToCamelCase(reportRaw) : null;

  async function getLatestFrontPhotoUrl(
    supabase: SupabaseClient,
    assetId: string,
  ): Promise<string | undefined> {
    const { data: row, error } = await supabase
      .from("condition_reports")
      .select(
        `
        id,
        created_at,
        cr_side_photos!inner (
          side,
          storage_path
        )
      `,
      )
      .eq("asset_id", assetId)
      .eq("status", "submitted")
      .is("deleted_at", null)
      .eq("cr_side_photos.side", "front")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !row) return undefined;
    const storagePath: string | undefined =
      row.cr_side_photos?.[0]?.storage_path;
    if (!storagePath) return undefined;

    return getSignedImageUrl(supabase, storagePath, { expiresIn: 3600 }); // 1 hour
  }

  const mainImageUrl = await getLatestFrontPhotoUrl(supabase, vehicle.id);

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
              <BreadcrumbLink asChild>
                <Link href="/inventory">Inventory</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="uppercase">
                {vehicle.identifier}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Card>
          <CardHeader>
            <div className="relative mb-4 flex aspect-[3/4] max-h-72 w-40 items-center justify-center overflow-hidden rounded-lg border bg-gray-100">
              {mainImageUrl ? (
                <Image
                  src={mainImageUrl}
                  alt={`Photo of ${vehicle.identifier}`}
                  fill
                  className="object-cover"
                  priority
                  unoptimized
                />
              ) : (
                <div className="text-muted-foreground flex h-full w-full flex-col items-center justify-center">
                  <Car className="mb-2 h-10 w-10 opacity-30" />
                  <span className="text-xs opacity-50">No image available</span>
                </div>
              )}
            </div>
            <CardTitle className="mb-1 text-2xl uppercase">
              {vehicle.identifier}
            </CardTitle>
            <CardDescription>
              {vehicle.make || vehicle.model ? (
                <span>
                  {vehicle.make} {vehicle.model}
                </span>
              ) : (
                <span>No make/model info</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Vehicle Info Grid */}
            <dl className="mb-6 grid grid-cols-2 gap-x-10 gap-y-3">
              <div>
                <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Registration
                </dt>
                <dd className="text-base uppercase">{vehicle.identifier}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Status
                </dt>
                <dd className="capitalize">{statusLabel}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Location
                </dt>
                <dd className="text-base">
                  {!current.hasHistory ? (
                    <span className="text-muted-foreground">—</span>
                  ) : isCheckedIn && current.locationName ? (
                    <>
                      <span className="font-medium">
                        {current.locationName}
                      </span>
                      {current.locationZoneName && (
                        <span className="text-muted-foreground">
                          {" "}
                          — {current.locationZoneName}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Checked out</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Type
                </dt>
                <dd className="capitalize">{vehicle.assetType ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Fuel/Drive
                </dt>
                <dd className="capitalize">{vehicle.vehicleType ?? "-"}</dd>
              </div>

              <div>
                <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Colour
                </dt>
                <dd>{vehicle.colour ?? "-"}</dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Notes
                </dt>
                <dd>
                  {vehicle.notes || (
                    <span className="text-muted-foreground">None</span>
                  )}
                </dd>
              </div>
            </dl>

            <div className="mt-2">
              <Link
                href={`/vehicle/${vehicle.id}/contracts`}
                className="text-sm text-blue-600 underline hover:text-blue-800"
              >
                View contracts →
              </Link>
            </div>

            {/* Client/Owner section */}
            <Separator className="my-4" />
            <div className="mb-6">
              <div className="mb-2 font-semibold">Client</div>
              <Card className="bg-muted/50 border-muted">
                <CardContent className="py-4">
                  {vehicle.client ? (
                    <div>
                      <div className="text-base font-medium">
                        {vehicle.client.firstName} {vehicle.client.lastName}
                        {vehicle.client.companyName && (
                          <span className="text-muted-foreground ml-2 text-sm">
                            ({vehicle.client.companyName})
                          </span>
                        )}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {vehicle.client.email && (
                          <div>Email: {vehicle.client.email}</div>
                        )}
                        {vehicle.client.phone && (
                          <div>Phone: {vehicle.client.phone}</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      No client info found
                    </span>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Checkout Button */}
            {isCheckedIn && (
              <div className="mb-6">
                <CheckoutVehicleButton
                  assetId={vehicle.id}
                  currentLocation={{
                    id: current.locationId,
                    name: current.locationName,
                    zoneId: current.locationZoneId,
                    zoneName: current.locationZoneName,
                  }}
                />
              </div>
            )}

            {/* Most Recent Condition */}
            {report && (
              <div>
                <Separator className="mb-4" />
                <div className="mb-2 font-semibold">
                  Most Recent Condition Report
                </div>
                {report.updatedAt && (
                  <div className="text-muted-foreground mb-1 text-xs">
                    {`Submitted at ${formatDateUK(report.updatedAt)}`}
                  </div>
                )}
                <div className="text-muted-foreground text-sm">
                  Reason:{" "}
                  <span className="capitalize">
                    {getReportTypeLabel(report.reportType) ?? "Not specified"}
                  </span>
                  {report.odometer && <> · Odometer: {report.odometer} miles</>}
                </div>
                {report.notes && (
                  <div className="mt-1 text-sm">{report.notes}</div>
                )}
                <div className="mt-1">
                  <Link
                    href={`/vehicle/${vehicle.id}/condition-reports/${report.id}`}
                    className="text-sm underline"
                  >
                    View full report &rarr;
                  </Link>
                </div>
                <div className="mt-4">
                  <Link
                    href={`/vehicle/${vehicle.id}/condition-reports`}
                    className="text-sm underline"
                  >
                    See all condition reports
                  </Link>
                </div>
              </div>
            )}

            <Separator className="my-4" />
            <div className="mb-2 font-semibold">Movement history</div>

            {movements.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                No movements yet
              </div>
            ) : (
              <ul className="space-y-3">
                {movements.map((m) => {
                  const fromLabel = m.fromLocation?.name
                    ? `${m.fromLocation.name}${m.fromLocationZone?.name ? ` — ${m.fromLocationZone.name}` : ""}`
                    : m.fromLocationId
                      ? `(${m.fromLocationId.slice(0, 8)})`
                      : "—";

                  const toLabel = m.toLocation?.name
                    ? `${m.toLocation.name}${m.toLocationZone?.name ? ` — ${m.toLocationZone.name}` : ""}`
                    : m.toLocationId
                      ? `(${m.toLocationId.slice(0, 8)})`
                      : "—";

                  let line: React.ReactNode;
                  switch (m.eventType) {
                    case "check-in":
                      line = (
                        <>
                          Checked in to{" "}
                          <span className="font-medium">{toLabel}</span>
                        </>
                      );
                      break;
                    case "transfer":
                      line = (
                        <>
                          Transferred from{" "}
                          <span className="font-medium">{fromLabel}</span> to{" "}
                          <span className="font-medium">{toLabel}</span>
                        </>
                      );
                      break;
                    case "check-out":
                    default:
                      line = (
                        <>
                          Checked out from{" "}
                          <span className="font-medium">{fromLabel}</span>
                        </>
                      );
                      break;
                  }

                  return (
                    <li key={m.id} className="rounded border p-3">
                      <div className="flex flex-wrap items-center gap-x-2 text-sm">
                        <span className="font-medium">
                          {getMovementEventLabel(
                            m.eventType as MovementEventType,
                          )}
                        </span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">
                          {formatDateUK(m.movementTime)}
                        </span>
                      </div>

                      <div className="text-sm">{line}</div>

                      {m.createdByUser?.label && (
                        <div className="text-muted-foreground text-xs">
                          By {m.createdByUser.label}
                        </div>
                      )}
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
