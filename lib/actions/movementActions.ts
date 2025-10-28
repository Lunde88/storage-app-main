// lib/actions/movementActions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { getServerSupabaseClient } from "@/lib/supabaseServer";
import { cleanseMovementEventForDB } from "@/lib/cleanseForDB";
import { sendCheckoutEmail } from "@/lib/actions/sendCheckoutEmail";
import { sendCheckInEmail } from "@/lib/actions/sendCheckInEmail";

// Small helper so email/PDF can never hang a serverless request
function withTimeout<T>(p: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

// ---- Types ----
type BaseMovementInput = {
  assetId: string;
  locationId: string;
  locationZoneId: string | null;
  conditionReportId?: string | null;
  notes?: string | null;
  storageDetails?: Record<string, unknown> | null;
};

// ---- Helpers ----
async function validateZoneBelongsToLocation({
  supabase,
  zoneId,
  locationId,
  orgId,
}: {
  supabase: Awaited<ReturnType<typeof getServerSupabaseClient>>;
  zoneId: string;
  locationId: string;
  orgId: string;
}) {
  const { data: zone, error } = await supabase
    .from("location_zones")
    .select("id, location_id")
    .eq("id", zoneId)
    .eq("clerk_organisation_id", orgId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !zone) throw new Error("Sub-location not found.");
  if (zone.location_id !== locationId)
    throw new Error("Sub-location does not belong to the selected location.");
}

async function validateMovementRelatedEntities({
  assetId,
  locationId,
  locationZoneId,
  orgId,
  eventType,
  conditionReportId,
}: {
  assetId: string;
  locationId: string;
  locationZoneId?: string | null;
  orgId: string;
  eventType: "check-in" | "check-out";
  conditionReportId?: string | null;
}) {
  const supabase = await getServerSupabaseClient();

  // 1) Asset status
  const { data: assetRow, error: assetErr } = await supabase
    .from("assets_with_latest_event")
    .select("id, clerk_organisation_id, last_event_type")
    .eq("id", assetId)
    .eq("clerk_organisation_id", orgId)
    .maybeSingle();

  if (assetErr) throw new Error("Failed to check asset status.");
  if (!assetRow)
    throw new Error("Asset not found or not in your organisation.");
  if (eventType === "check-in" && assetRow.last_event_type === "check-in") {
    throw new Error("Asset is already checked in.");
  }
  if (eventType === "check-out" && !assetRow.last_event_type) {
    throw new Error(
      "Cannot check out an asset that has never been checked in.",
    );
  }
  if (eventType === "check-out" && assetRow.last_event_type === "check-out") {
    throw new Error("Asset is already checked out.");
  }

  // 2) Location
  const { data: location, error: locationError } = await supabase
    .from("locations")
    .select("id, clerk_organisation_id")
    .is("deleted_at", null)
    .eq("id", locationId)
    .eq("clerk_organisation_id", orgId)
    .single();
  if (locationError || !location)
    throw new Error("Location not found or not in your organisation");

  if (eventType === "check-in" && locationZoneId) {
    await validateZoneBelongsToLocation({
      supabase,
      zoneId: locationZoneId,
      locationId,
      orgId,
    });
  }

  // 3) Optional: Condition report belongs to org
  if (conditionReportId) {
    const { data: report, error: reportError } = await supabase
      .from("condition_reports")
      .select("id, clerk_organisation_id")
      .is("deleted_at", null)
      .eq("id", conditionReportId)
      .eq("clerk_organisation_id", orgId)
      .single();
    if (reportError || !report)
      throw new Error("Condition report not found or not in your organisation");
  }

  // 4) Prevent duplicate check-in
  if (eventType === "check-in") {
    const { data: lastMove, error: lastMoveErr } = await supabase
      .from("asset_movements")
      .select("to_location_id, event_type")
      .is("deleted_at", null)
      .eq("asset_id", assetId)
      .eq("clerk_organisation_id", orgId)
      .order("movement_time", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .single();

    if (!lastMoveErr && lastMove && lastMove.event_type === "check-in") {
      throw new Error(
        "Asset is already checked in at a location. You must check out before checking in again.",
      );
    }
  }

  // 5) Check-out must match last checked-in location
  if (eventType === "check-out") {
    const { data: lastMove, error: lastMoveErr } = await supabase
      .from("asset_movements")
      .select("to_location_id, event_type")
      .is("deleted_at", null)
      .eq("asset_id", assetId)
      .eq("clerk_organisation_id", orgId)
      .order("movement_time", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .single();

    if (lastMoveErr || !lastMove)
      throw new Error("No movement history for asset.");
    if (
      (lastMove.event_type !== "check-in" &&
        lastMove.event_type !== "transfer") ||
      lastMove.to_location_id !== locationId
    ) {
      throw new Error(
        "Asset is not checked in at this location—cannot check out from here.",
      );
    }
  }
}

// ---- Actions ----

// CHECK-IN
export async function checkInVehicle(
  input: BaseMovementInput,
): Promise<{ id: string }> {
  "use server";
  // @ts-expect-error next runtime hint
  checkInVehicle.runtime = "nodejs";

  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authorised");

  await validateMovementRelatedEntities({
    assetId: input.assetId,
    locationId: input.locationId,
    locationZoneId: input.locationZoneId ?? null,
    orgId,
    eventType: "check-in",
    conditionReportId: input.conditionReportId ?? null,
  });

  const supabase = await getServerSupabaseClient();

  // Build the payload WITHOUT org/user (DB defaults fill those)
  const clean = cleanseMovementEventForDB({
    assetId: input.assetId,
    eventType: "check-in",
    fromLocationId: null,
    fromLocationZoneId: null,
    toLocationId: input.locationId,
    toLocationZoneId: input.locationZoneId ?? null,
    conditionReportId: input.conditionReportId ?? null,
    notes: input.notes ?? null,
    quantityMoved: null,
    storageDetails: input.storageDetails ?? null,
  });

  const { data, error } = await supabase
    .from("asset_movements")
    .insert([clean]) // ← use the variable you created
    .select("id")
    .single();

  if (error || !data?.id) {
    throw error ?? new Error("Check-in event insert failed");
  }

  try {
    await withTimeout(sendCheckInEmail({ movementId: data.id }), 12_000);
  } catch (e) {
    console.warn("[checkInVehicle] email step failed (non-fatal):", e);
  }

  return { id: data.id };
}

// CHECK-OUT
export async function checkOutVehicle(
  input: BaseMovementInput,
): Promise<{ id: string }> {
  "use server";
  // @ts-expect-error next runtime hint
  checkOutVehicle.runtime = "nodejs";

  const { userId, orgId } = await auth();
  if (!userId || !orgId) throw new Error("Not authorised");

  await validateMovementRelatedEntities({
    assetId: input.assetId,
    locationId: input.locationId,
    orgId,
    eventType: "check-out",
    conditionReportId: input.conditionReportId ?? null,
  });

  const supabase = await getServerSupabaseClient();

  const { data: lastMove } = await supabase
    .from("asset_movements")
    .select("to_location_id, to_location_zone_id, event_type")
    .is("deleted_at", null)
    .eq("asset_id", input.assetId)
    .eq("clerk_organisation_id", orgId)
    .order("movement_time", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .single();

  const fromZoneId =
    lastMove &&
    (lastMove.event_type === "check-in" || lastMove.event_type === "transfer")
      ? (lastMove.to_location_zone_id ?? null)
      : null;

  const dbMovementEvent = cleanseMovementEventForDB({
    assetId: input.assetId,
    eventType: "check-out",
    fromLocationId: input.locationId,
    fromLocationZoneId: fromZoneId,
    toLocationId: null,
    toLocationZoneId: null,
    conditionReportId: input.conditionReportId ?? null,
    notes: input.notes ?? null,
    quantityMoved: null,
    storageDetails: input.storageDetails ?? null,
  });

  const { data, error } = await supabase
    .from("asset_movements")
    .insert([dbMovementEvent])
    .select("id")
    .single();

  if (error || !data?.id)
    throw error ?? new Error("Check-out event insert failed");

  // const movementId = (data[0] as MovementEvent).id;
  const movementId = data.id;
  try {
    await withTimeout(sendCheckoutEmail({ movementId }), 12_000);
  } catch (e) {
    console.warn("[checkOutVehicle] email step failed (non-fatal):", e);
  }

  return { id: data.id };
}

// TRANSFER
export async function transferVehicle(input: {
  assetId: string;
  fromLocationId?: string | null;
  fromLocationZoneId?: string | null;
  toLocationId: string;
  toLocationZoneId?: string | null;
  conditionReportId?: string | null;
  notes?: string | null;
  storageDetails?: Record<string, unknown> | null;
}) {
  "use server";
  // @ts-expect-error next runtime hint
  transferVehicle.runtime = "nodejs";

  const { userId, orgId } = await auth();
  if (!userId || !orgId) throw new Error("Not authorised");

  const supabase = await getServerSupabaseClient();

  let fromLocationId = input.fromLocationId ?? null;
  let fromLocationZoneId = input.fromLocationZoneId ?? null;

  if (!fromLocationId || fromLocationZoneId === null) {
    const { data: lastMove, error: lastMoveErr } = await supabase
      .from("asset_movements")
      .select("event_type, to_location_id, to_location_zone_id")
      .is("deleted_at", null)
      .eq("asset_id", input.assetId)
      .eq("clerk_organisation_id", orgId)
      .order("movement_time", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastMoveErr || !lastMove || lastMove.event_type !== "check-in") {
      throw new Error("Asset is not currently checked in, cannot transfer.");
    }
    fromLocationId = lastMove.to_location_id;
    fromLocationZoneId = lastMove.to_location_zone_id ?? null;
  }

  if (!input.toLocationId) throw new Error("Destination is required.");

  const sameLocation = fromLocationId === input.toLocationId;
  const toZone = input.toLocationZoneId ?? null;
  const sameZone = (fromLocationZoneId ?? null) === toZone;
  if (sameLocation && sameZone) {
    throw new Error("Destination must change location or sub-location.");
  }

  const { data: dest, error: destErr } = await supabase
    .from("locations")
    .select("id, clerk_organisation_id")
    .is("deleted_at", null)
    .eq("id", input.toLocationId)
    .eq("clerk_organisation_id", orgId)
    .single();
  if (destErr || !dest)
    throw new Error(
      "Destination location not found or not in your organisation.",
    );

  if (input.toLocationZoneId) {
    await validateZoneBelongsToLocation({
      supabase,
      zoneId: input.toLocationZoneId,
      locationId: input.toLocationId,
      orgId,
    });
  }

  const movementEvent = cleanseMovementEventForDB({
    assetId: input.assetId,
    eventType: "transfer",
    fromLocationId,
    fromLocationZoneId,
    toLocationId: input.toLocationId,
    toLocationZoneId: input.toLocationZoneId ?? null,
    conditionReportId: input.conditionReportId ?? null,
    notes: input.notes ?? null,
    quantityMoved: null,
    storageDetails: input.storageDetails ?? null,
  });

  const { data, error } = await supabase
    .from("asset_movements")
    .insert([movementEvent])
    .select("id")
    .single();

  if (error || !data?.id)
    throw error ?? new Error("Transfer event insert failed");

  return { id: data.id };
}
