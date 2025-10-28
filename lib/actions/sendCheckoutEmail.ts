// lib/emails/sendCheckoutEmail.ts
"use server";

import { getServerSupabaseClient } from "@/lib/supabaseServer";

// NEW shared helpers
import { sendMail } from "@/lib/emails/core/sendMail";
import { ukDateTime, asReg, fullName } from "@/lib/emails/core/format";
import { tpl } from "@/lib/emails/templates";
import { maybeBuildReportPdf } from "@/lib/emails/core/pdf";

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
  from_location?: RawLoc | RawLoc[] | null;
  asset?: RawAsset | RawAsset[] | null;
};

export async function sendCheckoutEmail({
  movementId,
}: {
  movementId: string;
}): Promise<void> {
  const supabase = await getServerSupabaseClient();

  const { data: m, error } = await supabase
    .from("asset_movements")
    .select(
      `
        id,
        movement_time,
        notes,
        condition_report_id,
         from_location:locations!asset_movements_from_location_fk ( name ),
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

  if (error || !m) return; // log if you like and exit quietly

  const fromLoc = one(m.from_location);
  const asset = one(m.asset);
  const client = one(asset?.client);

  const to = client?.email ?? null;
  if (!to) return; // nothing to send to

  // Formatting via helpers
  const vehicleReg = asReg(asset?.identifier);
  const clientName = fullName(client?.first_name, client?.last_name);
  const occurredAt = ukDateTime(m.movement_time);
  const fromLocation = fromLoc?.name ?? null;

  // Build template
  const { subject, html, text } = tpl.checkout({
    clientName,
    vehicleReg,
    occurredAt,
    fromLocation,
  });

  // Try to attach a report if present (with timeout + safe failure)
  const attachments = await maybeBuildReportPdf(
    m.condition_report_id,
    asset?.id ?? null,
  );

  // Send via shared wrapper (handles required `text`, filters nulls)
  await sendMail({
    to,
    subject,
    html,
    text,
    attachments,
    headers: { "Idempotency-Key": `checkout-${movementId}` },
  });
}
