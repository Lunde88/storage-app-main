// lib/actions/reportEmail.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { getServerSupabaseClient } from "@/lib/supabaseServer";
import { generateReportPdf } from "@/components/pdf/generateReportPdf";
import { resolveReportTimestamp } from "@/lib/actions/resolveReportTimestamp";

// helpers
import { sendMail } from "@/lib/emails/core/sendMail";
import { ukDateTime, asReg } from "@/lib/emails/core/format";
import { tpl } from "@/lib/emails/templates";

type Input = {
  reportId: string;
  vehicleId: string;
  to?: string | string[];
  cc?: string | string[] | null;
  bcc?: string | string[] | null;
  message?: string | null;
  reportType?: string | null;
  reportTimestampIso?: string | null;
};

// helper: flatten array-or-object joins
const one = <T>(v: T | T[] | null | undefined): T | undefined =>
  v == null ? undefined : Array.isArray(v) ? v[0] : v;

type RawClient = {
  email: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

export async function sendEmailReport(input: Input) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) throw new Error("Not authorised");

  const supabase = await getServerSupabaseClient();

  // 1) Resolve recipient server-side
  let toMaybe: string | string[] | undefined = input.to;

  if (!toMaybe) {
    const { data: row, error } = await supabase
      .from("assets")
      .select(
        `
          identifier,
          client:clients!client_id ( email, first_name, last_name )
        `,
      )
      .eq("id", input.vehicleId)
      .maybeSingle<{
        identifier: string | null;
        client: RawClient | RawClient[] | null;
      }>();

    if (error) throw new Error(error.message);
    const client = one(row?.client);
    const email = client?.email ?? null;
    if (!email) throw new Error("Client has no email on file");
    toMaybe = email;
  }

  const to: string | string[] = toMaybe;

  // 2) Build the PDF (kept here because you already have reportId + vehicleId)
  const { buffer, filename, clientName, vehicleIdentifier } =
    await generateReportPdf(input.reportId, input.vehicleId);

  // 3) Prepare template context via helpers
  const reportTimestamp = await resolveReportTimestamp(input, async () => {
    const { data: reportRow, error: reportErr } = await supabase
      .from("condition_reports")
      .select("submitted_at, created_at")
      .eq("id", input.reportId)
      .maybeSingle<{
        submitted_at: string | null;
        created_at: string | null;
      }>();

    if (reportErr) {
      console.error(
        "[sendReportEmail] failed to load report timestamp from Supabase",
        reportErr,
      );
    }

    return reportRow ?? null;
  });

  const reportCreatedAt = ukDateTime(reportTimestamp);

  const displayName = clientName?.trim() || "there";
  const vehicleReg = asReg(vehicleIdentifier);

  const { subject, html, text } = tpl.report({
    clientName: displayName,
    vehicleReg,
    message: input.message ?? null,
    type: input.reportType,
    reportCreatedAt,
  });

  // 4) Send via the shared mail wrapper (filters null cc/bcc, guarantees text)
  await sendMail({
    to,
    subject,
    html,
    text,
    cc: input.cc ?? undefined,
    bcc: input.bcc ?? undefined,
    attachments: [
      {
        filename,
        content: buffer, // Buffer
        contentType: "application/pdf",
      },
    ],
    // from: "Your Brand <noreply@yourdomain.com>", // optional override
  });

  return { ok: true };
}
