// components/pdf/generateReportPdf.ts
import "server-only";
export const runtime = "nodejs";

import { getServerSupabaseClient } from "@/lib/supabaseServer";
import {
  getMovementEventLabel,
  getReportTypeLabel,
  VEHICLE_LEVELS,
  type ReportType,
} from "@/lib/types";
import { getSignedImageUrl } from "@/lib/storage/getSignedImageUrl";
import { buildReportPdf, type JpegSource } from "@/components/pdf/ReportPdf";

type PdfResult = {
  buffer: Buffer; // <-- explicit Buffer
  filename: string;
  vehicleIdentifier: string;
  clientName: string;
};

/** util: UK date */
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

/** convert a storage path to a JPEG buffer React-PDF can embed */
async function signedUrlToJpeg(
  supabase: Awaited<ReturnType<typeof getServerSupabaseClient>>,
  storagePath?: string,
): Promise<JpegSource | undefined> {
  if (!storagePath) return undefined;
  const url = await getSignedImageUrl(supabase, storagePath, { expiresIn: 60 });
  if (!url) return undefined;

  // Add a timeout so we don't hang serverless
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Range: "bytes=0-" },
      signal: controller.signal,
    });
    if (!res.ok) return undefined;

    const input = Buffer.from(await res.arrayBuffer());

    // Lazy-import sharp inside the function (Node-only native addon)
    const sharp = (await import("sharp")).default;

    const out = await sharp(input)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .jpeg({ quality: 82, chromaSubsampling: "4:2:0" })
      .toBuffer();

    const meta = await sharp(out).metadata();
    return out.length
      ? {
          data: out,
          format: "jpg",
          width: meta.width ?? 1600,
          height: meta.height ?? 1200,
        }
      : undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(t);
  }
}

// ---- minimal row types to mirror your download route ----
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
  movement_time: string;
  notes: string | null;
  quantity_moved: number | null;
  condition_report_id: string | null;
  storage_details: Record<string, unknown> | null;
  from_location: { name: string } | null;
  to_location: { name: string } | null;
  created_by_user: { full_name: string } | null;
};

type MarkerPhoto = {
  id: string;
  storage_path: string;
  sort_index: number | null;
};
type Marker = {
  id: string;
  x: number;
  y: number;
  w: number | null;
  h: number | null;
  label: string | null;
  note: string | null;
  cr_marker_photos?: MarkerPhoto[];
};
type SidePhoto = {
  id: string;
  side: "front" | "nearside" | "back" | "offside" | "interior";
  storage_path: string;
  cr_markers?: Marker[];
};

type PdfOptions = {
  noImages?: boolean;
};

export async function generateReportPdf(
  reportId: string,
  vehicleId?: string,
  options?: PdfOptions,
): Promise<PdfResult> {
  const noImages = options?.noImages ?? false;
  // Lazy-import @react-pdf/renderer inside the function (avoid edge/module-scope issues)
  const { pdf } = await import("@react-pdf/renderer");

  const supabase = await getServerSupabaseClient();

  // 1) report
  const { data: report, error: reportErr } = await supabase
    .from("condition_reports")
    .select(
      `
      id, asset_id, created_at, updated_at, submitted_at, report_type,
      odometer, notes, status, vehicle_levels,
      inspector:users!condition_reports_inspector_user_fk ( full_name )
    `,
    )
    .eq("id", reportId)
    .is("deleted_at", null)
    .maybeSingle<ReportRow>();

  if (reportErr) {
    console.error("[pdf] report query failed:", reportErr);
  }

  if (!report || (vehicleId && report.asset_id !== vehicleId))
    throw new Error("Report not found");

  // 2) vehicle
  const { data: vehicle, error: vehicleErr } = await supabase
    .from("assets")
    .select(
      `
        id,
        identifier,
        client:clients ( first_name, last_name )
      `,
    )
    .eq("id", report.asset_id)
    .maybeSingle<{
      id: string;
      identifier: string;
      client: { first_name: string; last_name: string } | null;
    }>();

  if (vehicleErr) console.error("[pdf] vehicle query failed:", vehicleErr);

  if (!vehicle) throw new Error("Vehicle not found");

  // 3) last movement
  const { data: latestMovement, error: mvErr } = await supabase
    .from("asset_movements")
    .select(
      `
      id, event_type, movement_time, notes, quantity_moved, condition_report_id,
      storage_details,
      from_location:locations!asset_movements_from_location_fk ( name ),
      to_location:locations!asset_movements_to_location_fk ( name ),
      created_by_user:users!asset_movements_created_by_user_fk ( full_name )
    `,
    )
    .eq("asset_id", report.asset_id)
    .is("deleted_at", null)
    .order("movement_time", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle<MovementRow>();

  if (mvErr) {
    console.error("[pdf] latest movement query failed:", mvErr);
  }

  // 4) sides + markers + photos
  const { data: sidesRaw } = await supabase
    .from("cr_side_photos")
    .select(
      `
      id, side, storage_path,
      cr_markers (
        id, x, y, w, h, label, note,
        cr_marker_photos ( id, storage_path, sort_index )
      )
    `,
    )
    .eq("report_id", report.id);

  const sides = (sidesRaw ?? []) as SidePhoto[];

  // layout math
  const PAGE_W = 595.28,
    H_PAD = 28;
  const CONTENT_W = PAGE_W - H_PAD * 2;
  const COLS = 2,
    COL_GAP = 8,
    CARD_PAD = 8;
  const CARD_W = Math.floor((CONTENT_W - COL_GAP * (COLS - 1)) / COLS);
  const IMAGE_W = CARD_W - CARD_PAD * 2;

  const sidesForPdf = noImages
    ? [] // skip image processing if noImages is true
    : await Promise.all(
        sides.map(async (sp) => {
          const main = await signedUrlToJpeg(supabase, sp.storage_path);
          const displayHeight = main
            ? Math.round((IMAGE_W * main.height) / main.width)
            : 0;

          const markers = await Promise.all(
            (sp.cr_markers ?? []).map(async (m) => {
              const photos = await Promise.all(
                (m.cr_marker_photos ?? [])
                  .sort((a, b) => (a.sort_index ?? 0) - (b.sort_index ?? 0))
                  .slice(0, 4)
                  .map(async (p) => ({
                    id: p.id,
                    pdfSrc: await signedUrlToJpeg(supabase, p.storage_path),
                  })),
              );
              return {
                id: m.id,
                x: m.x,
                y: m.y,
                w: m.w,
                h: m.h,
                label: m.label,
                note: m.note,
                photos,
              };
            }),
          );

          return {
            id: sp.id,
            side: sp.side,
            main,
            cardWidth: CARD_W,
            displayWidth: IMAGE_W,
            displayHeight,
            markers,
          };
        }),
      );

  // Compose PDF component
  const element = buildReportPdf({
    vehicleIdentifier: vehicle.identifier,
    reportTitle: getReportTypeLabel(report.report_type),
    createdAt: formatDateUK(report.created_at),
    updatedAt: report.updated_at ? formatDateUK(report.updated_at) : null,
    submittedAt: report.submitted_at ? formatDateUK(report.submitted_at) : null,
    status: report.status,
    odometerMiles: report.odometer,
    inspector: report.inspector?.full_name ?? null,
    movement: latestMovement
      ? {
          event: getMovementEventLabel(latestMovement.event_type),
          when: formatDateUK(latestMovement.movement_time),
          from: latestMovement.from_location?.name ?? null,
          to: latestMovement.to_location?.name ?? null,
          createdBy: latestMovement.created_by_user?.full_name ?? null,
          quantity: latestMovement.quantity_moved ?? null,
          notes: latestMovement.notes ?? null,
        }
      : undefined,
    levels: report.vehicle_levels
      ? (VEHICLE_LEVELS.map((lvl) => {
          const v = report.vehicle_levels?.[lvl.key];
          return v == null
            ? null
            : {
                key: lvl.key,
                label: lvl.label,
                pct: Math.round(Number(v) * 100),
              };
        }).filter(Boolean) as Array<{
          key: string;
          label: string;
          pct: number;
        }>)
      : [],
    sides: sidesForPdf,
    notes: report.notes ?? null,
    pdfGeneratedAt: formatDateUK(new Date()),
  });

  const blob = await pdf(element).toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  const nodeBuffer = Buffer.from(arrayBuffer); // <-- Node Buffer

  const vehicleIdentifier = vehicle.identifier.toUpperCase();
  const filename = `${vehicleIdentifier.replace(/[^a-z0-9-_]/gi, "_")}-CONDITION-REPORT-${report.id.slice(0, 8)}.pdf`;
  const clientName = vehicle?.client
    ? `${vehicle.client.first_name} ${vehicle.client.last_name}`
    : "Unknown client";

  return { buffer: nodeBuffer, filename, vehicleIdentifier, clientName };
}
