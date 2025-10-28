// lib/emails/sendCheckInEmail.ts
"use server";

import { getServerSupabaseClient } from "@/lib/supabaseServer";

// shared helpers
import { sendMail } from "@/lib/emails/core/sendMail";
import { ukDateTime, asReg, fullName } from "@/lib/emails/core/format";
import { tpl } from "@/lib/emails/templates";
import { maybeBuildReportPdf } from "@/lib/emails/core/pdf";
import {
  labelForStorageCover,
  labelForTrickleCharger,
  labelForValeting,
  StorageCover,
  TrickleCharger,
  Valeting,
} from "../types";

// flatten helper
const one = <T>(v: T | T[] | null | undefined): T | null =>
  v == null ? null : Array.isArray(v) ? (v[0] ?? null) : v;

type RawLoc = { name: string };
type RawClient = {
  email: string | null;
  first_name?: string | null;
  last_name?: string | null;
};
type RawAsset = {
  id: string;
  identifier: string | null;
  client?: RawClient | RawClient[] | null;
};
type RawRow = {
  id: string;
  movement_time: string;
  notes: string | null;
  condition_report_id: string | null;
  to_location?: RawLoc | RawLoc[] | null;
  asset?: RawAsset | RawAsset[] | null;
  storage_details?: Record<string, unknown> | null;
};

export async function sendCheckInEmail({
  movementId,
}: {
  movementId: string;
}): Promise<void> {
  const supabase = await getServerSupabaseClient();

  // 1) Fetch movement + joins
  const { data: m, error } = await supabase
    .from("asset_movements")
    .select(
      `
        id,
        movement_time,
        notes,
        condition_report_id,
        storage_details,
        to_location:locations!asset_movements_to_location_fk ( name ),
        asset:assets (
          id,
          identifier,
          client:clients ( email, first_name, last_name )
        )
      `,
    )
    .eq("id", movementId)
    .is("deleted_at", null)
    .maybeSingle()
    .overrideTypes<RawRow, { merge: false }>();

  if (error || !m) {
    // optional: log error?.message
    return;
  }

  const asset = one(m.asset);
  const client = one(asset?.client);
  const toLoc = one(m.to_location);

  const to = client?.email ?? null;
  if (!to) {
    // No recipient; exit quietly
    return;
  }

  // 2) Build “check-in details” from storage_details JSON
  const sd = m.storage_details ?? {};
  // Safely coerce to strings for template rendering
  const str = (v: unknown) => (v == null ? undefined : String(v).trim());
  const boolish = (v: unknown): boolean => {
    if (typeof v === "boolean") return v;
    const s = String(v).toLowerCase();
    return s === "true" || s === "yes" || s === "1";
  };

  const checkInDetails: Record<string, string> = {
    Location: toLoc?.name ?? "N/A",
    "Tag number": str(sd["tag_number"]) ?? "—",
    Cover: labelForStorageCover(sd["cover"] as StorageCover),
    Charger: labelForTrickleCharger(sd["charger"] as TrickleCharger),
    Valeting: labelForValeting(sd["valeting"] as Valeting),
    "MOT required": boolish(sd["mot_required"])
      ? `Yes${str(sd["mot_date"]) ? ` (by ${str(sd["mot_date"])})` : ""}`
      : "No",
    "Service required": boolish(sd["service_required"])
      ? `Yes${str(sd["service_date"]) ? ` (by ${str(sd["service_date"])})` : ""}`
      : "No",
  };

  // 3) Formatting + template
  const vehicleReg = asReg(asset?.identifier);
  const clientName = fullName(client?.first_name, client?.last_name);
  const occurredAt = ukDateTime(m.movement_time);

  // If you want friendlier keys in plain-text, normalise here (optional)
  // const normalisedDetails = Object.fromEntries(
  //   Object.entries(checkInDetails).map(([k, v]) => [niceKey(k), v]),
  // );

  const { subject, html, text } = tpl.checkIn({
    clientName,
    vehicleReg,
    occurredAt,
    notes: m.notes,
    checkInDetails: checkInDetails,
  });

  // 4) Optional PDF attachment (with timeout & safe fallback)
  const attachments = await maybeBuildReportPdf(
    m.condition_report_id,
    asset?.id ?? null,
  );

  // 5) Send
  await sendMail({
    to,
    subject,
    html,
    text,
    attachments,
    headers: { "Idempotency-Key": `checkin-${movementId}` }, // optional
  });
}
