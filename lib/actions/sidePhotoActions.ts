"use server";

import { auth } from "@clerk/nextjs/server";
import { getServerSupabaseClient } from "@/lib/supabaseServer";
import { Side } from "../types";

export async function upsertSidePhoto(params: {
  reportId: string;
  side: Side;
  storagePath: string;
  width?: number;
  height?: number;
}) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authorised");

  const supabase = await getServerSupabaseClient();

  // Authorise: report belongs to org
  const { data: report, error: rErr } = await supabase
    .from("condition_reports")
    .select("id")
    .eq("id", params.reportId)
    .eq("clerk_organisation_id", orgId)
    .single();
  if (rErr || !report) throw new Error("Report not found / not in your org");

  const payload = {
    report_id: params.reportId,
    side: params.side,
    storage_path: params.storagePath,
    width: params.width ?? null,
    height: params.height ?? null,
  };

  // upsert on unique (report_id, side)
  const { data, error } = await supabase
    .from("cr_side_photos")
    .upsert(payload, { onConflict: "report_id,side" })
    .select("id, report_id, side, storage_path")
    .single();

  if (error) throw error;
  return data!;
}
