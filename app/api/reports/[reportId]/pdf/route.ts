import { generateReportPdf } from "@/components/pdf/generateReportPdf";
import { auth } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

function toSafeFilename(name: string) {
  return name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { reportId } = await params;
    const vehicleId = new URL(req.url).searchParams.get("vehicleId") ?? "";

    // Authorise: confirm report belongs to vehicle & org
    const supabase = await getServerSupabaseClient();
    const { data: row, error } = await supabase
      .from("condition_reports")
      .select("id, asset_id")
      .eq("id", reportId)
      .eq("asset_id", vehicleId)
      .eq("clerk_organisation_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !row) return new NextResponse("Not found", { status: 404 });

    // Build PDF
    const { buffer, filename } = await generateReportPdf(reportId, vehicleId);

    // Make sure it's a standard ArrayBuffer (not SharedArrayBuffer)
    const arrayBuffer = Uint8Array.from(buffer).buffer;

    const safeName = toSafeFilename(filename);
    const headers = new Headers({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "no-store",
    });
    // Optional but nice
    headers.set("Content-Length", String(buffer.byteLength));

    return new NextResponse(arrayBuffer, { headers });
  } catch (e) {
    console.error("[report/pdf] failed:", e);
    return new NextResponse("Server error", { status: 500 });
  }
}
