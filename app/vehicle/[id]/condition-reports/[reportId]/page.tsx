import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabaseClient } from "@/lib/supabaseServer";
import {
  getMovementEventLabel,
  getReportTypeLabel,
  ReportType,
  VEHICLE_LEVELS,
} from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getSignedImageUrl } from "@/lib/storage/getSignedImageUrl";
import SendReportEmailButton from "@/components/emails/SendReportEmailButton";

type ReportRow = {
  id: string;
  asset_id: string;
  created_at: string;
  updated_at: string | null;
  submitted_at: string | null;
  report_type: ReportType;
  odometer: number | null;
  notes: string | null;
  status: string | null;
  vehicle_levels: Record<string, number | null> | null;
  inspector: { full_name: string } | null;
};

type MovementRow = {
  id: string;
  event_type: "check-in" | "check-out" | "transfer";
  movement_time: string; // ISO
  notes: string | null;
  quantity_moved: number | null;
  condition_report_id: string | null;
  storage_details: Record<string, unknown> | null;
  from_location: { name: string } | null;
  to_location: { name: string } | null;
  from_location_zone: { name: string } | null;
  to_location_zone: { name: string } | null;
  created_by_user: { full_name: string } | null;
};

// --- Types that match your tables ---
type MarkerPhotoRow = {
  id: string;
  storage_path: string;
  sort_index: number | null;
};
type MarkerRow = {
  id: string;
  x: number; // 0..1
  y: number; // 0..1
  w: number | null; // 0..1 (optional bbox)
  h: number | null; // 0..1
  label: string | null;
  note: string | null;
  cr_marker_photos?: MarkerPhotoRow[];
};
type SidePhotoRow = {
  id: string;
  report_id: string;
  side: "front" | "nearside" | "back" | "offside" | "interior";
  storage_path: string;
  created_at: string;
  cr_markers?: MarkerRow[];
};

// Augment a type with an optional signedUrl
type WithSignedUrl<T> = T & { signedUrl?: string };

// Marker photo row with signedUrl
type MarkerPhotoRowOut = WithSignedUrl<MarkerPhotoRow>;

// Marker row with marker photos including signedUrl
type MarkerRowOut = Omit<MarkerRow, "cr_marker_photos"> & {
  cr_marker_photos?: MarkerPhotoRowOut[];
};

// Side photo row with signedUrl and markers
type SidePhotoRowOut = Omit<SidePhotoRow, "cr_markers"> & {
  signedUrl?: string;
  cr_markers?: MarkerRowOut[];
};

// --- Helpers ---
function prettifyKey(k: string) {
  return k
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v;
  return JSON.stringify(v); // fallback for nested objects/arrays
}

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

const SIDE_LABEL: Record<SidePhotoRow["side"], string> = {
  front: "Front",
  nearside: "Nearside",
  back: "Back",
  offside: "Offside",
  interior: "Interior",
};

const SIDE_ORDER: SidePhotoRow["side"][] = [
  "front",
  "nearside",
  "back",
  "offside",
  "interior",
];

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string; reportId: string }>;
}) {
  const supabase = await getServerSupabaseClient();
  const { id: vehicleId, reportId } = await params;

  // 1) Verify report belongs to vehicle
  const { data: report, error: reportErr } = await supabase
    .from("condition_reports")
    .select(
      `
    id,
    asset_id,
    created_at,
    updated_at,
    submitted_at,
    report_type,
    odometer,
    notes,
    status,
    vehicle_levels,
    inspector:users!condition_reports_inspector_user_fk ( full_name )
  `,
    )
    .eq("id", reportId)
    .is("deleted_at", null)
    .maybeSingle()
    .overrideTypes<ReportRow, { merge: false }>();

  if (reportErr || !report || report.asset_id !== vehicleId) return notFound();

  const { data: latestMovement, error: mvErr } = await supabase
    .from("asset_movements")
    .select(
      `
    id, event_type, movement_time, notes, quantity_moved,
    condition_report_id, storage_details,
    from_location:locations!asset_movements_from_location_fk ( name ),
    to_location:locations!asset_movements_to_location_fk ( name ),
    from_location_zone:location_zones!asset_movements_from_location_zone_fk ( name ),
    to_location_zone:location_zones!asset_movements_to_location_zone_fk ( name ),
    created_by_user:users!asset_movements_created_by_user_fk ( full_name )
  `,
    )
    .eq("condition_report_id", report.id)
    .is("deleted_at", null)
    .maybeSingle()
    .overrideTypes<MovementRow, { merge: false }>();

  if (mvErr) {
    console.error(mvErr);
  }

  const reportTimestampIso = report.submitted_at ?? report.created_at;

  // 2) Vehicle identifier (for heading/breadcrumbs)
  const { data: vehicle } = await supabase
    .from("assets")
    .select("id, identifier, client:clients ( email )")
    .eq("id", vehicleId)
    .maybeSingle<{
      id: string;
      identifier: string;
      client: { email: string | null } | null;
    }>();
  if (!vehicle) return notFound();

  const clientEmail = vehicle?.client?.email ?? null;

  // 3) Side photos + markers + marker photos
  const { data: sidesRaw, error: sidesErr } = await supabase
    .from("cr_side_photos")
    .select(
      `
      id, report_id, side, storage_path, created_at,
      cr_markers (
        id, x, y, w, h, label, note, created_at,
        cr_marker_photos ( id, storage_path, sort_index, created_at )
      )
    `,
    )
    .eq("report_id", reportId);

  if (sidesErr) {
    console.error(sidesErr);
    return <div className="p-6">Error loading report photos.</div>;
  }

  const sides = (sidesRaw ?? []) as SidePhotoRow[];

  // 4) Sign URLs (side photos + marker photos)
  const signed: SidePhotoRowOut[] = await Promise.all(
    sides.map(async (sp) => {
      if (!sp.storage_path) {
        console.warn(
          "[report/detail] Missing storage_path for side:",
          sp.side,
          sp.id,
        );
      }
      const sideUrl = await getSignedImageUrl(supabase, sp.storage_path, {
        expiresIn: 3600,
      });

      const markers = await Promise.all(
        (sp.cr_markers ?? []).map(async (m) => {
          const photos: MarkerPhotoRowOut[] = await Promise.all(
            (m.cr_marker_photos ?? [])
              .sort((a, b) => (a.sort_index ?? 0) - (b.sort_index ?? 0))
              .map(async (p) => ({
                ...p,
                signedUrl: await getSignedImageUrl(supabase, p.storage_path, {
                  expiresIn: 3600,
                }),
              })),
          );
          return { ...m, cr_marker_photos: photos };
        }),
      );

      return { ...sp, signedUrl: sideUrl, cr_markers: markers };
    }),
  );

  const ordered = signed.sort(
    (a, b) => SIDE_ORDER.indexOf(a.side) - SIDE_ORDER.indexOf(b.side),
  );

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
                <Link href="/inventory">Inventory</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink className="uppercase" asChild>
                <Link href={`/vehicle/${vehicle.id}`}>
                  {vehicle.identifier}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/vehicle/${vehicle.id}/condition-reports`}>
                  Condition Reports
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Report</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        {/* --- Report header WITH movement context merged --- */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="uppercase">
              {vehicle.identifier} —{" "}
              {getReportTypeLabel(report.report_type) ?? "Condition Report"}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6 text-sm">
            {/* Reason & movement context */}
            <div>
              <div className="text-muted-foreground mb-2 text-xs tracking-wide uppercase">
                Reason & Context
              </div>

              {latestMovement ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="text-muted-foreground">
                    <div className="text-xs tracking-wide uppercase">Event</div>
                    <div className="text-foreground">
                      {getMovementEventLabel(latestMovement.event_type)}
                    </div>
                  </div>

                  <div className="text-muted-foreground">
                    <div className="text-xs tracking-wide uppercase">When</div>
                    <div className="text-foreground">
                      {formatDateUK(latestMovement.movement_time)}
                    </div>
                  </div>

                  <div className="text-muted-foreground">
                    <div className="text-xs tracking-wide uppercase">From</div>
                    <div className="text-foreground">
                      {latestMovement.from_location?.name ?? "—"}
                      {latestMovement.from_location_zone?.name ? (
                        <span className="text-muted-foreground block text-xs">
                          {latestMovement.from_location_zone.name}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="text-muted-foreground">
                    <div className="text-xs tracking-wide uppercase">To</div>
                    <div className="text-foreground">
                      {latestMovement.to_location?.name ?? "—"}
                      {latestMovement.to_location_zone?.name ? (
                        <span className="text-muted-foreground block text-xs">
                          {latestMovement.to_location_zone.name}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="text-muted-foreground">
                    <div className="text-xs tracking-wide uppercase">
                      Created By
                    </div>
                    <div className="text-foreground">
                      {latestMovement.created_by_user?.full_name ?? "—"}
                    </div>
                  </div>

                  {typeof latestMovement.quantity_moved === "number" && (
                    <div className="text-muted-foreground">
                      <div className="text-xs tracking-wide uppercase">
                        Quantity
                      </div>
                      <div className="text-foreground">
                        {latestMovement.quantity_moved}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground">
                  No recent movement recorded.
                </div>
              )}

              {/* Movement notes (still part of context) */}
              {latestMovement?.notes && (
                <>
                  <Separator className="my-4" />
                  <div className="text-muted-foreground text-xs tracking-wide uppercase">
                    Movement Notes
                  </div>
                  <div className="whitespace-pre-wrap">
                    {latestMovement.notes}
                  </div>
                </>
              )}

              {/* Storage details (still part of context) */}
              <Separator className="my-4" />
              <div className="text-muted-foreground text-xs tracking-wide uppercase">
                Storage Details
              </div>

              {latestMovement?.storage_details &&
              Object.keys(latestMovement.storage_details).length > 0 ? (
                (() => {
                  // Safely cast for local use
                  const sd = latestMovement.storage_details as Record<
                    string,
                    unknown
                  >;
                  const recipient = sd.recipient as
                    | {
                        name?: string | null;
                        email?: string | null;
                        phone?: string | null;
                      }
                    | undefined;

                  // Keys to exclude from display
                  const hiddenKeys = ["recipient", "seeded_from_report_id"];

                  return (
                    <div className="grid gap-3">
                      {/* Recipient (only on check-outs) */}
                      {recipient && (
                        <div className="flex items-start justify-between">
                          <span className="text-foreground">Recipient</span>
                          <div className="text-right">
                            <div className="font-medium">
                              {recipient.name ?? "—"}
                            </div>
                            <div className="text-muted-foreground text-sm">
                              {recipient.email && <div>{recipient.email}</div>}
                              {recipient.phone && <div>{recipient.phone}</div>}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Render remaining keys except hidden ones */}
                      {Object.entries(sd)
                        .filter(([k]) => !hiddenKeys.includes(k))
                        .map(([k, v]) => (
                          <div
                            key={k}
                            className="flex items-center justify-between"
                          >
                            <span className="text-foreground">
                              {prettifyKey(k)}
                            </span>
                            <span className="text-muted-foreground">
                              {formatValue(v)}
                            </span>
                          </div>
                        ))}
                    </div>
                  );
                })()
              ) : (
                <div className="text-muted-foreground">
                  No storage details recorded.
                </div>
              )}

              {/* If the movement links to THIS report, show that clearly; if it links to another, link out */}
              {latestMovement?.condition_report_id && (
                <>
                  <Separator className="my-4" />
                  <div className="text-muted-foreground text-xs tracking-wide uppercase">
                    Related Condition Report
                  </div>
                  {latestMovement.condition_report_id === report.id ? (
                    <div className="text-foreground">
                      This movement triggered this report.
                    </div>
                  ) : (
                    <div>
                      <Link
                        href={`/vehicle/${vehicle.id}/condition-reports/${latestMovement.condition_report_id}`}
                        className="underline"
                      >
                        Open related report
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Report meta */}
            <div>
              <Separator className="my-2" />
              <div className="text-muted-foreground mb-2 text-xs tracking-wide uppercase">
                Report Details
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="text-muted-foreground">
                  <div className="text-xs tracking-wide uppercase">Created</div>
                  <div className="text-foreground">
                    {formatDateUK(report.created_at)}
                  </div>
                </div>

                {report.updated_at && (
                  <div className="text-muted-foreground">
                    <div className="text-xs tracking-wide uppercase">
                      Last Updated
                    </div>
                    <div className="text-foreground">
                      {formatDateUK(report.updated_at)}
                    </div>
                  </div>
                )}

                {report.submitted_at && (
                  <div className="text-muted-foreground">
                    <div className="text-xs tracking-wide uppercase">
                      Submitted
                    </div>
                    <div className="text-foreground">
                      {formatDateUK(report.submitted_at)}
                    </div>
                  </div>
                )}

                <div className="text-muted-foreground">
                  <div className="text-xs tracking-wide uppercase">Status</div>
                  <div className="text-foreground capitalize">
                    {report.status ?? "—"}
                  </div>
                </div>

                <div className="text-muted-foreground">
                  <div className="text-xs tracking-wide uppercase">Reason</div>
                  <div className="text-foreground capitalize">
                    {getReportTypeLabel(report.report_type) ?? "Not specified"}
                  </div>
                </div>

                <div className="text-muted-foreground">
                  <div className="text-xs tracking-wide uppercase">
                    Odometer
                  </div>
                  <div className="text-foreground">
                    {report.odometer != null ? `${report.odometer} miles` : "—"}
                  </div>
                </div>

                <div className="text-muted-foreground">
                  <div className="text-xs tracking-wide uppercase">
                    Inspector
                  </div>
                  <div className="text-foreground">
                    {report?.inspector?.full_name ?? "—"}
                  </div>
                </div>
              </div>

              {/* Free-text report notes */}
              {report.notes && (
                <>
                  <Separator className="my-4" />
                  <div className="text-muted-foreground text-xs tracking-wide uppercase">
                    Notes
                  </div>
                  <div className="whitespace-pre-wrap">{report.notes}</div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Levels */}
        {report.vehicle_levels && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Vehicle Levels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {VEHICLE_LEVELS.map((level) => {
                const val = report.vehicle_levels?.[level.key];
                if (val === null || val === undefined) {
                  return (
                    <div
                      key={level.key}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-foreground">{level.label}</span>
                      <span className="text-muted-foreground italic">
                        Not recorded
                      </span>
                    </div>
                  );
                }

                const pct = Math.round(Number(val) * 100);
                return (
                  <div key={level.key}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-foreground">{level.label}</span>
                      <span className="text-muted-foreground">{pct}%</span>
                    </div>
                    <div className="bg-muted h-2 w-full overflow-hidden rounded">
                      <div
                        className="bg-primary h-full"
                        style={{ width: `${pct}%` }}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={pct}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
        {/* Sides */}
        <div className="grid gap-8 lg:grid-cols-2">
          {ordered.map((sp) => (
            <Card key={sp.id}>
              <CardHeader>
                <CardTitle className="capitalize">
                  {SIDE_LABEL[sp.side] ?? sp.side}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Intrinsic-size image with overlay (no fixed aspect) */}
                <div className="relative inline-block rounded-md border bg-white">
                  {sp.signedUrl ? (
                    <>
                      <img
                        src={sp.signedUrl}
                        alt={`${sp.side} photo`}
                        className="block h-auto max-w-full"
                        draggable={false}
                      />
                      {/* Markers: positioned by percentage relative to the image box */}
                      {(sp.cr_markers ?? []).map((m, idx) => {
                        const hasBox =
                          m.w != null && m.h != null && m.w > 0 && m.h > 0;
                        return (
                          <div
                            key={m.id}
                            className="pointer-events-none absolute"
                            style={{
                              left: `${Number(m.x) * 100}%`,
                              top: `${Number(m.y) * 100}%`,
                              transform: "translate(-50%, -50%)",
                            }}
                          >
                            {hasBox ? (
                              <>
                                <div
                                  className="border-2 border-red-600/80 bg-transparent"
                                  style={{
                                    width: `${Number(m.w) * 100}%`,
                                    height: `${Number(m.h) * 100}%`,
                                  }}
                                />
                                <div className="mt-1 inline-flex items-center rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                  #{idx + 1}
                                </div>
                              </>
                            ) : (
                              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#86101E] bg-[#FFE4E7] text-xs text-[#86101E] shadow">
                                {idx + 1}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <div className="text-muted-foreground flex h-40 w-64 items-center justify-center text-sm">
                      No image available
                    </div>
                  )}
                </div>

                {/* Marker notes + thumbnails */}
                <div className="mt-4">
                  {(sp.cr_markers ?? []).length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No markers for this side.
                    </p>
                  ) : (
                    <ul className="space-y-4">
                      {(sp.cr_markers ?? []).map((m, idx) => (
                        <li key={m.id}>
                          <div className="text-muted-foreground mb-1 text-xs">
                            Marker {idx + 1}
                          </div>
                          <div className="rounded-md border p-3">
                            {m.label && (
                              <div className="text-xs font-semibold tracking-wide uppercase">
                                {m.label}
                              </div>
                            )}
                            {m.note ? (
                              <p className="mt-1 text-sm whitespace-pre-wrap">
                                {m.note}
                              </p>
                            ) : (
                              <p className="text-muted-foreground mt-1 text-sm">
                                No note.
                              </p>
                            )}

                            {m.cr_marker_photos &&
                              m.cr_marker_photos.length > 0 && (
                                <>
                                  <Separator className="my-3" />
                                  <div className="flex flex-wrap gap-2">
                                    {m.cr_marker_photos.map((mp) =>
                                      mp.signedUrl ? (
                                        <a
                                          key={mp.id}
                                          href={mp.signedUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="relative block h-24 w-24 overflow-hidden rounded border"
                                          title="Open full image"
                                        >
                                          <img
                                            src={mp.signedUrl}
                                            alt="Marker photo"
                                            className="h-full w-full object-cover"
                                            draggable={false}
                                          />
                                        </a>
                                      ) : null,
                                    )}
                                  </div>
                                </>
                              )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-8 flex flex-col items-start gap-3">
        <a
          href={`/api/reports/${report.id}/pdf?vehicleId=${vehicle.id}`}
          className="mt-10 underline"
          target="_blank" // avoids SPA interception
          rel="noopener"
        >
          Download PDF
        </a>

        <SendReportEmailButton
          reportId={report.id}
          vehicleId={vehicle.id}
          defaultTo={clientEmail ?? ""}
          reportTimestampIso={reportTimestampIso}
          reportType={report.report_type}
        />
      </div>
    </div>
  );
}
