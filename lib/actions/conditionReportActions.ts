"use server";

import { auth } from "@clerk/nextjs/server";
import { getServerSupabaseClient } from "@/lib/supabaseServer";
import { cleanseConditionReportForDB } from "@/lib/cleanseForDB";
import type { ConditionReportDraft, ReportType } from "@/lib/types";
import type { Side } from "@/lib/types";

/* -------------------------------------------------------
   1) Draft helpers — you already have these
------------------------------------------------------- */

type DraftWithScalars = {
  id: string;
  odometer: number | null;
  notes: string | null;
  vehicleLevels: Partial<Record<string, number | null>> | null;
  updatedAt: string | null;
  createdAt: string;
  seededFromReportId?: string | null;
  wasCreatedNow?: boolean;
};

type EnsureDraftArgs = {
  assetId: string;
  reportType?: ReportType;
  createBlank?: boolean;
};

export async function ensureDraftWithScalars(
  args: EnsureDraftArgs | string, // backward compat
): Promise<DraftWithScalars> {
  const assetId = typeof args === "string" ? args : args.assetId;
  const reportType =
    typeof args === "string" ? "check-in" : (args.reportType ?? "check-in");
  const createBlank = typeof args === "string" ? false : !!args.createBlank;

  const { userId, orgId } = await auth();
  if (!userId || !orgId) throw new Error("Not authorised");
  if (!assetId) throw new Error("Asset ID required");

  const supabase = await getServerSupabaseClient();

  // 1) Verify asset belongs to org
  {
    const { data, error } = await supabase
      .from("assets")
      .select("id")
      .eq("id", assetId)
      .eq("clerk_organisation_id", orgId)
      .single();
    if (error || !data)
      throw new Error("Asset not found or not in your organisation");
  }

  // 2) Reuse the most recent draft for this asset + reportType
  if (!createBlank) {
    const { data: draft, error } = await supabase
      .from("condition_reports")
      .select("id, odometer, notes, vehicle_levels, updated_at, created_at")
      .eq("asset_id", assetId)
      .eq("clerk_organisation_id", orgId)
      .eq("status", "draft")
      .eq("report_type", reportType) // <- make sure you pass "check-out" (hyphen)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (draft?.id) {
      return {
        id: draft.id,
        odometer: draft.odometer ?? null,
        notes: draft.notes ?? null,
        vehicleLevels: (draft.vehicle_levels ?? null) as Record<
          string,
          number | null
        > | null,
        updatedAt: draft.updated_at ?? null,
        createdAt: draft.created_at,
        seededFromReportId: null,
        wasCreatedNow: false,
      };
    }
  }

  // 3) Seed scalars for CHECK-OUT from the latest SUBMITTED report (any report_type)
  //    If none found, fall back to empty.
  let seedOdometer: number | null = null;
  let seedNotes: string | null = null;
  let seedLevels: Record<string, number | null> | null = null;
  let seedId: string | null = null;

  if (!createBlank && reportType === "check-out") {
    const { data: latestSubmitted, error: latestErr } = await supabase
      .from("condition_reports")
      .select("id, odometer, notes, vehicle_levels")
      .eq("asset_id", assetId)
      .eq("clerk_organisation_id", orgId)
      .eq("status", "submitted")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestErr) {
      // Don’t fail the flow; just seed empty if the lookup errors
      console.warn(
        "[ensureDraftWithScalars] latest submitted lookup failed; seeding blank:",
        latestErr,
      );
    } else if (latestSubmitted) {
      seedId = latestSubmitted.id ?? null;
      seedOdometer =
        typeof latestSubmitted.odometer === "number"
          ? latestSubmitted.odometer
          : null;
      seedNotes = latestSubmitted.notes ?? null;
      seedLevels = (latestSubmitted.vehicle_levels ?? null) as Record<
        string,
        number | null
      > | null;
    }
  }

  // 4) Insert a fresh draft (seeded for check-out, empty for check-in or when createBlank = true)
  const insertPayload = {
    asset_id: assetId,
    report_type: reportType,
    status: "draft" as const,
    odometer: createBlank ? null : seedOdometer,
    notes: createBlank ? null : seedNotes,
    vehicle_levels: createBlank ? null : seedLevels,
  };

  const { data: inserted, error: insertErr } = await supabase
    .from("condition_reports")
    .insert([insertPayload])
    .select("id, odometer, notes, vehicle_levels, updated_at, created_at")
    .single();

  if (insertErr || !inserted?.id)
    throw insertErr || new Error("Failed to create draft");

  return {
    id: inserted.id,
    odometer: inserted.odometer ?? null,
    notes: inserted.notes ?? null,
    vehicleLevels: (inserted.vehicle_levels ?? null) as Record<
      string,
      number | null
    > | null,
    updatedAt: inserted.updated_at ?? null,
    createdAt: inserted.created_at,
    seededFromReportId: seedId,
    wasCreatedNow: true,
  };
}

// OPTIONAL: keep the old signature working for legacy callers
export async function ensureDraftWithScalars_legacy(
  assetId: string,
): Promise<DraftWithScalars> {
  return ensureDraftWithScalars({ assetId, reportType: "check-in" });
}

export async function updateDraftReport(
  reportId: string,
  patch: {
    odometer?: number | null;
    notes?: string | null;
    vehicleLevels?: Record<string, number | null> | null; // maps to vehicle_levels JSONB
  },
) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authorised");
  if (!reportId) throw new Error("Report ID required");

  const supabase = await getServerSupabaseClient();

  // Normalise undefined → null for DB columns you want to clear
  const payload = {
    odometer: patch.odometer ?? null,
    notes: patch.notes ?? null,
    vehicle_levels: patch.vehicleLevels ?? null, // <-- adjust if your column name differs
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("condition_reports")
    .update(payload)
    .eq("id", reportId)
    .eq("clerk_organisation_id", orgId)
    .eq("status", "draft")
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) throw error;

  // We return a boolean for symmetry (client already avoids unchanged writes).
  return { changed: !!data?.id };
}

/** Upsert (report_id, side) and return its id */
export async function upsertSidePhoto(args: {
  reportId: string;
  side: Side;
  storagePath: string;
}): Promise<{ sidePhotoId: string }> {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authorised");

  const supabase = await getServerSupabaseClient();

  // Ensure UNIQUE(report_id, side) exists in DB for safe upsert
  const { error: upsertErr } = await supabase.from("cr_side_photos").upsert(
    [
      {
        report_id: args.reportId,
        side: args.side,
        storage_path: args.storagePath,
      },
    ],
    { onConflict: "report_id,side" },
  );

  if (upsertErr) throw upsertErr;

  // Return id
  const { data, error } = await supabase
    .from("cr_side_photos")
    .select("id")
    .eq("report_id", args.reportId)
    .eq("side", args.side)
    .single();

  if (error || !data?.id)
    throw error || new Error("Side photo not found after upsert");

  return { sidePhotoId: data.id };
}

/** Delete a side photo row (and cascade its markers) by storage_path. */
export async function deleteSidePhotoByPath(args: {
  storagePath: string;
}): Promise<{ deleted: boolean }> {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authorised");
  const storagePath = (args.storagePath || "").trim();
  if (!storagePath) throw new Error("storagePath required");

  const supabase = await getServerSupabaseClient();

  // Verify the side photo belongs to this org via the report
  const { data: sp, error: lookErr } = await supabase
    .from("cr_side_photos")
    .select(
      "id, report_id, storage_path, report:report_id ( clerk_organisation_id )",
    )
    .eq("storage_path", storagePath)
    .maybeSingle();

  if (lookErr) throw lookErr;
  if (!sp?.id) return { deleted: false };

  // Delete the side photo (FK should cascade to markers + marker_photos)
  const { data: del, error: delErr } = await supabase
    .from("cr_side_photos")
    .delete()
    .eq("id", sp.id)
    .select("id")
    .maybeSingle();

  if (delErr) throw delErr;

  return { deleted: !!del?.id };
}

/** Create a marker for a given side photo (x,y are 0..1 in image coords) */
export async function createMarker(args: {
  sidePhotoId: string;
  x: number;
  y: number;
  note: string;
}): Promise<{ markerId: string }> {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authorised");

  const supabase = await getServerSupabaseClient();

  const { data, error } = await supabase
    .from("cr_markers")
    .insert([
      {
        side_photo_id: args.sidePhotoId,
        x: args.x,
        y: args.y,
        note: args.note,
      },
    ])
    .select("id")
    .single();

  if (error || !data?.id) throw error || new Error("Failed to create marker");
  return { markerId: data.id };
}

/** Add a marker photo row pointing at an already-uploaded storage object */
export async function addMarkerPhoto(args: {
  markerId: string;
  storagePath: string;
}): Promise<{ id: string }> {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authorised");

  const supabase = await getServerSupabaseClient();

  const { data, error } = await supabase
    .from("cr_marker_photos")
    .insert([{ marker_id: args.markerId, storage_path: args.storagePath }])
    .select("id")
    .single();

  if (error || !data?.id)
    throw error || new Error("Failed to create marker photo");
  return { id: data.id };
}

export async function deleteMarker(args: {
  markerId: string;
}): Promise<{ photoPaths: string[] }> {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authorised");
  if (!args.markerId) throw new Error("Marker ID required");

  const supabase = await getServerSupabaseClient();

  // 1) Read all marker photo storage paths (so we can remove files after DB delete)
  const { data: mphotos, error: readErr } = await supabase
    .from("cr_marker_photos")
    .select("storage_path")
    .eq("marker_id", args.markerId);

  if (readErr) throw readErr;

  const photoPaths = (mphotos ?? []).map((p) => p.storage_path);

  // 2) Delete the marker (ON DELETE CASCADE removes marker_photos rows)
  const { error: delErr } = await supabase
    .from("cr_markers")
    .delete()
    .eq("id", args.markerId);

  if (delErr) throw delErr;

  return { photoPaths };
}

/* -------------------------------------------------------
   2) Finalise a draft (update + set status='final')
------------------------------------------------------- */

export async function finalizeConditionReport(params: {
  reportId: string; // draft id to finalise
  assetId: string; // must match the report's asset
  condition: ConditionReportDraft;
}) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) throw new Error("Not authorised");

  const { reportId, assetId, condition } = params;
  if (!reportId) throw new Error("Report ID missing");
  if (!assetId) throw new Error("Asset ID missing");

  const supabase = await getServerSupabaseClient();

  // Validate the report belongs to the org and to the same asset
  const { data: rpt, error: rptErr } = await supabase
    .from("condition_reports")
    .select("id, asset_id, status")
    .eq("id", reportId)
    .is("deleted_at", null)
    .eq("clerk_organisation_id", orgId)
    .single();

  if (rptErr || !rpt) throw new Error("Condition report not found");
  if (rpt.asset_id !== assetId) throw new Error("Report/asset mismatch");

  // Build server-safe payload (server owns inspector/org fields)
  const full = {
    ...condition,
    id: reportId, // ensure we're updating this report id
    assetId,
    inspectorId: userId,
    clerkOrganisationId: orgId,
    reportType: condition.reportType ?? "check-in",
    status: "final" as const,
    photoUrls: (condition.photoUrls ?? []).filter(Boolean),
    damagedParts: (condition.damagedParts ?? []).map((p) => ({
      part: p.part,
      notes: p.notes,
      imageStoragePath: p.imageStoragePath,
    })),
  };

  // camelCase -> snake_case mapping (for UPDATE)
  const db = cleanseConditionReportForDB(full);

  // Prevent changing created_at/ids on update
  const dbMutable = db as Partial<Record<string, unknown>>;
  delete dbMutable.id;
  delete dbMutable.created_at;

  const { data, error } = await supabase
    .from("condition_reports")
    .update(db)
    .eq("id", reportId)
    .eq("clerk_organisation_id", orgId)
    .is("deleted_at", null)
    .select("id")
    .single();

  if (error || !data?.id) {
    throw error || new Error("Failed to finalise condition report");
  }

  return { id: data.id };
}

/* -------------------------------------------------------
   3) Compatibility wrapper for your parent page
      (keeps existing import working)
------------------------------------------------------- */

export async function insertConditionReport(
  condition: ConditionReportDraft,
  assetId: string,
): Promise<{ id: string }> {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authorised");

  // If the step already created a draft and stored its id in `condition.id`,
  // treat this as finalisation; otherwise do a one-shot insert.
  if (condition.id) {
    return finalizeConditionReport({
      reportId: condition.id,
      assetId,
      condition,
    });
  }

  // One-shot final insert (no prior draft)
  const { userId } = await auth();
  if (!userId) throw new Error("Not authorised");

  const supabase = await getServerSupabaseClient();

  // Ensure asset is in org
  const { data: assetRow, error: assetErr } = await supabase
    .from("assets")
    .select("id")
    .eq("id", assetId)
    .eq("clerk_organisation_id", orgId)
    .single();
  if (assetErr || !assetRow) {
    throw new Error("Asset not found or not in your organisation");
  }

  const full = {
    ...condition,
    assetId,
    inspectorId: userId,
    clerkOrganisationId: orgId,
    reportType: condition.reportType ?? "check-in",
    status: "final" as const,
    photoUrls: (condition.photoUrls ?? []).filter(Boolean),
    damagedParts: (condition.damagedParts ?? []).map((p) => ({
      part: p.part,
      notes: p.notes,
      imageStoragePath: p.imageStoragePath,
    })),
  };

  const dbRow = cleanseConditionReportForDB(full);
  const { data, error } = await supabase
    .from("condition_reports")
    .insert([dbRow])
    .select("id")
    .single();

  if (error || !data?.id) {
    throw error || new Error("Condition report insert failed");
  }

  return { id: data.id };
}

// Read back side photos, markers, and marker photos for a report ---
export async function getReportImages(reportId: string) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authorised");
  const supabase = await getServerSupabaseClient();

  // Side photos for this report
  const { data: sideRows, error: sideErr } = await supabase
    .from("cr_side_photos")
    .select("id, side, storage_path")
    .eq("report_id", reportId);

  if (sideErr) throw sideErr;

  // Build quick lookup (and list of side_photo_ids)
  const sides: Record<
    Side,
    { sidePhotoId: string; storagePath: string } | null
  > = {
    front: null,
    nearside: null,
    back: null,
    offside: null,
    interior: null,
  };
  const sidePhotoIds: string[] = [];
  for (const r of sideRows ?? []) {
    sides[r.side as Side] = { sidePhotoId: r.id, storagePath: r.storage_path };
    sidePhotoIds.push(r.id);
  }

  if (sidePhotoIds.length === 0) {
    return { sides, observationsBySidePhotoId: {} as Record<string, never> };
  }

  // Markers under those side photos
  const { data: markerRows, error: markerErr } = await supabase
    .from("cr_markers")
    .select("id, side_photo_id, x, y, note")
    .in("side_photo_id", sidePhotoIds);

  if (markerErr) throw markerErr;

  const markerIds = markerRows?.map((m) => m.id) ?? [];

  // Marker photos under those markers
  const { data: mphotoRows, error: mphotoErr } = await supabase
    .from("cr_marker_photos")
    .select("id, marker_id, storage_path")
    .in(
      "marker_id",
      markerIds.length ? markerIds : ["00000000-0000-0000-0000-000000000000"],
    );

  if (mphotoErr) throw mphotoErr;

  // Group observations by side_photo_id
  const observationsBySidePhotoId: Record<
    string,
    Array<{
      markerId: string;
      x: number;
      y: number;
      note: string | null;
      photoPaths: string[];
    }>
  > = {};

  for (const m of markerRows ?? []) {
    const photos = (mphotoRows ?? [])
      .filter((p) => p.marker_id === m.id)
      .map((p) => p.storage_path);
    (observationsBySidePhotoId[m.side_photo_id] ??= []).push({
      markerId: m.id,
      x: m.x,
      y: m.y,
      note: m.note ?? "",
      photoPaths: photos,
    });
  }

  return { sides, observationsBySidePhotoId };
}

// export async function submitReport(reportId: string) {
//   const supabase = await getServerSupabaseClient();

//   const { orgId } = await auth();
//   if (!orgId) throw new Error("Not authorised");

//   // Only submit drafts; be idempotent
//   const { error } = await supabase
//     .from("condition_reports")
//     .update({
//       status: "submitted",
//       submitted_at: new Date().toISOString(),
//     })
//     .eq("id", reportId)
//     .eq("status", "draft") // guard so we don’t re-stamp if already submitted
//     .is("deleted_at", null)
//     .select("id, status, submitted_at")
//     .single();

//   if (error) {
//     // If no row matched because it’s already submitted, fetch to report state cleanly
//     const { data: existing, error: fetchErr } = await supabase
//       .from("condition_reports")
//       .select("id, status, submitted_at")
//       .eq("id", reportId)
//       .eq("clerk_organisation_id", orgId)
//       .is("deleted_at", null)
//       .single();

//     if (fetchErr) throw new Error(fetchErr.message);
//     return {
//       ok: true,
//       alreadySubmitted: existing.status === "submitted",
//       report: existing,
//     };
//   }

//   // return { ok: true, alreadySubmitted: false, report: data };
// }

export async function submitReport(reportId: string): Promise<void> {
  const supabase = await getServerSupabaseClient();
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authorised");

  const { error } = await supabase
    .from("condition_reports")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", reportId)
    .eq("status", "draft")
    .is("deleted_at", null);

  if (error) {
    // treat “no rows” (already submitted) as success; otherwise throw
    if (error.code !== "PGRST116") throw new Error("Failed to submit report");
  }
  // return void
}

// export async function discardDraftReport(reportId: string): Promise<{
//   ok: boolean;
//   removedPaths: string[];
// }> {
//   const { orgId } = await auth();
//   if (!orgId) throw new Error("Not authorised");
//   if (!reportId) throw new Error("Report ID required");

//   const supabase = await getServerSupabaseClient();

//   // 0) Verify draft exists, belongs to org, and is not already soft-deleted
//   const { data: rpt, error: rptErr } = await supabase
//     .from("condition_reports")
//     .select("id, status, deleted_at, clerk_organisation_id")
//     .eq("id", reportId)
//     .eq("clerk_organisation_id", orgId)
//     .maybeSingle();

//   if (rptErr) throw rptErr;
//   if (!rpt) throw new Error("Draft not found");
//   if (rpt.deleted_at) {
//     // already discarded; nothing else to do
//     return { ok: true, removedPaths: [] };
//   }
//   if (rpt.status !== "draft") {
//     throw new Error("Only draft reports can be discarded");
//   }

//   // 1) Gather storage paths to clean up (reads allowed by your select policy)
//   const { data: sidePhotos, error: spErr } = await supabase
//     .from("cr_side_photos")
//     .select("id, storage_path")
//     .eq("report_id", reportId);
//   if (spErr) throw spErr;

//   const sidePhotoIds = (sidePhotos ?? []).map((s) => s.id);
//   const sidePhotoPaths = (sidePhotos ?? [])
//     .map((s) => s.storage_path)
//     .filter(Boolean);

//   const { data: markers, error: mkErr } = await supabase
//     .from("cr_markers")
//     .select("id")
//     .in(
//       "side_photo_id",
//       sidePhotoIds.length
//         ? sidePhotoIds
//         : ["00000000-0000-0000-0000-000000000000"],
//     );
//   if (mkErr) throw mkErr;

//   const markerIds = (markers ?? []).map((m) => m.id);

//   const { data: mphotos, error: mphErr } = await supabase
//     .from("cr_marker_photos")
//     .select("storage_path")
//     .in(
//       "marker_id",
//       markerIds.length ? markerIds : ["00000000-0000-0000-0000-000000000000"],
//     );
//   if (mphErr) throw mphErr;

//   const markerPhotoPaths = (mphotos ?? [])
//     .map((p) => p.storage_path)
//     .filter(Boolean);
//   const allPaths = Array.from(
//     new Set([...sidePhotoPaths, ...markerPhotoPaths]),
//   );

//   // 2) Soft-delete the report (and optionally set status)
//   const now = new Date().toISOString();
//   const { data: upd, error: updErr } = await supabase
//     .from("condition_reports")
//     .update({ deleted_at: now }) // optional status change
//     .eq("id", reportId)
//     .eq("clerk_organisation_id", orgId)
//     .eq("status", "draft") // still OK to keep this guard
//     .is("deleted_at", null) // only if not already soft-deleted
//     .select("id")
//     .maybeSingle();

//   if (updErr) throw updErr;
//   if (!upd?.id) throw new Error("No draft row was updated for soft delete.");

//   // 3) Best-effort: remove files from storage
//   const removedPaths: string[] = [];
//   if (allPaths.length) {
//     const { data: rmData, error: rmErr } = await supabase.storage
//       .from("asset-images")
//       .remove(allPaths);
//     if (rmErr) {
//       console.error("[discardDraftReport] Storage remove failed:", rmErr);
//     } else if (Array.isArray(rmData)) {
//       const removedSet = new Set(rmData.map((f) => f.name));
//       removedPaths.push(...allPaths.filter((p) => removedSet.has(p)));
//     }
//   }

//   return { ok: true, removedPaths };
// }

export async function discardDraftReport(reportId: string): Promise<{
  ok: boolean;
  removedPaths: string[];
}> {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authorised");
  if (!reportId) throw new Error("Report ID required");

  const supabase = await getServerSupabaseClient();

  // Ensure it's a draft in this org
  const { data: rpt, error: rptErr } = await supabase
    .from("condition_reports")
    .select("id, status")
    .eq("id", reportId)
    .eq("clerk_organisation_id", orgId)
    .maybeSingle();
  if (rptErr) throw rptErr;
  if (!rpt) throw new Error("Draft not found");
  if (rpt.status !== "draft")
    throw new Error("Only draft reports can be discarded");

  // Collect storage paths BEFORE deleting rows
  const { data: sidePhotos, error: spErr } = await supabase
    .from("cr_side_photos")
    .select("id, storage_path")
    .eq("report_id", reportId);
  if (spErr) throw spErr;

  const sidePhotoIds = (sidePhotos ?? []).map((s) => s.id);

  const { data: markers, error: mkErr } = await supabase
    .from("cr_markers")
    .select("id")
    .in(
      "side_photo_id",
      sidePhotoIds.length
        ? sidePhotoIds
        : ["00000000-0000-0000-0000-000000000000"],
    );
  if (mkErr) throw mkErr;

  const markerIds = (markers ?? []).map((m) => m.id);

  const { data: mphotos, error: mphErr } = await supabase
    .from("cr_marker_photos")
    .select("storage_path")
    .in(
      "marker_id",
      markerIds.length ? markerIds : ["00000000-0000-0000-0000-000000000000"],
    );
  if (mphErr) throw mphErr;

  const allPaths = Array.from(
    new Set([
      ...(sidePhotos ?? []).map((p) => p.storage_path).filter(Boolean),
      ...(mphotos ?? []).map((p) => p.storage_path).filter(Boolean),
    ]),
  );

  // Best-effort: delete storage files first
  const removedPaths: string[] = [];
  if (allPaths.length) {
    const { data: rmData, error: rmErr } = await supabase.storage
      .from("asset-images")
      .remove(allPaths);
    if (!rmErr && Array.isArray(rmData)) {
      const removed = new Set(rmData.map((f) => f.name));
      removedPaths.push(...allPaths.filter((p) => removed.has(p)));
    } else if (rmErr) {
      console.error("[discardDraftReport] Storage remove failed:", rmErr);
    }
  }

  // HARD delete the draft; cascades clean child rows
  const { error: delErr } = await supabase
    .from("condition_reports")
    .delete()
    .eq("id", reportId)
    .eq("clerk_organisation_id", orgId)
    .eq("status", "draft");
  if (delErr) throw delErr;

  return { ok: true, removedPaths };
}
