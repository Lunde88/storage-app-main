// app/api/reports/[reportId]/email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { generateReportPdf } from "@/components/pdf/generateReportPdf";
import { auth } from "@clerk/nextjs/server";
import { getServerSupabaseClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type EmailBody = {
  to: string | string[];
  cc?: string | string[] | null;
  bcc?: string | string[] | null;
  message?: string | null;
  checkInDetails?: {
    location: string;
    tagNumber: string;
    cover: string;
    charger: string;
    valeting: string;
    motRequired: string;
    serviceRequired: string;
  };
  type?: "check-in" | "generic";
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const { reportId } = await params;
  const vehicleId = new URL(req.url).searchParams.get("vehicleId") ?? "";

  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await getServerSupabaseClient();
  const { data: reportRow, error: reportLookupError } = await supabase
    .from("condition_reports")
    .select("id, asset_id, clerk_organisation_id")
    .eq("id", reportId)
    .is("deleted_at", null)
    .maybeSingle<{
      id: string;
      asset_id: string | null;
      clerk_organisation_id: string | null;
    }>();

  if (reportLookupError) {
    console.error("[report/email] report lookup failed:", reportLookupError);
    return NextResponse.json(
      { error: "Failed to load report" },
      { status: 500 },
    );
  }

  if (!reportRow) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  if (reportRow.clerk_organisation_id !== orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (vehicleId && reportRow.asset_id && reportRow.asset_id !== vehicleId) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // Parse once
  let body: EmailBody;
  try {
    body = (await req.json()) as EmailBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { to, cc, bcc, message } = body;
  if (!to || (Array.isArray(to) && to.length === 0)) {
    return NextResponse.json({ error: "`to` is required" }, { status: 400 });
  }

  // Build the PDF and filename
  let buffer: Buffer;
  let filename: string;
  let clientName: string;
  let vehicleIdentifier: string;
  try {
    ({ buffer, filename, clientName, vehicleIdentifier } =
      await generateReportPdf(reportId, vehicleId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Report not found" || message === "Vehicle not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    console.error("[report/email] failed to generate PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 },
    );
  }

  // Friendly greeting + timestamp
  const displayName =
    clientName && clientName.trim().length ? clientName : "there";

  const vehicleReg = vehicleIdentifier.toUpperCase();

  const todayUk = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(new Date());

  const subjectPrefix =
    body.type === "check-in" ? "Check-in confirmation" : "Condition report";

  const introText =
    body.type === "check-in"
      ? `<p>This email confirms that <strong>${vehicleReg}</strong> has been checked in. The condition report is attached below.</p>`
      : `<p>Please find attached the condition report for <strong>${vehicleReg}</strong>.</p>`;

  const subject = `${subjectPrefix} — ${vehicleReg} (${todayUk})`;

  const checkInHtml = body.checkInDetails
    ? `
  <h3 style="margin-top:16px;">Check-in Details</h3>
  <table style="border-collapse: collapse; width: 100%; font-size: 14px;">
    ${Object.entries(body.checkInDetails)
      .map(
        ([key, value]) => `
        <tr>
          <td style="padding: 6px 8px; border: 1px solid #ddd; font-weight: bold; text-transform: capitalize;">
            ${key.replace(/([A-Z])/g, " $1")}
          </td>
          <td style="padding: 6px 8px; border: 1px solid #ddd;">
            ${value}
          </td>
        </tr>
      `,
      )
      .join("")}
  </table>
  `
    : "";

  const checkInText = body.checkInDetails
    ? Object.entries(body.checkInDetails)
        .map(([key, value]) => `${key.replace(/([A-Z])/g, " $1")}: ${value}`)
        .join("\n")
    : "";

  const extraHtml = message && message.trim() ? `<p>${message}</p>` : "";

  const html = `
    <p>Hi ${displayName},</p>
     ${introText}
     ${checkInHtml}
     ${extraHtml}
    <p>Report date: ${todayUk}</p>
    <p>If you have any questions, just reply to this email.</p>
    <p>Kind regards,<br/>The Storage Team</p>
  `;

  const text = `
Hi ${displayName},

Please find attached the condition report for ${vehicleReg}.

${checkInText}

${message && message.trim() ? `Message: ${message}` : ""}

Report date: ${todayUk}

If you have any questions, just reply to this email.

Kind regards,
The Storage Team
`.trim();

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: "Storage App <mail@email-testing.builtbymagnus.co.uk>",
    to,
    cc: cc ?? undefined,
    bcc: bcc ?? undefined,
    subject,
    html,
    text,
    attachments: [
      {
        filename,
        content: buffer,
        contentType: "application/pdf",
      },
    ],
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
