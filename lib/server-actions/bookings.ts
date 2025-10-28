// lib/server-actions/bookings.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { getServerSupabaseClient } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

type BookingStatus =
  | "requested"
  | "confirmed"
  | "ready"
  | "in-progress"
  | "completed"
  | "cancelled"
  | "no-show";

function parseLocalDateTimeToISO(s: string | null): string | null {
  // input from <input type="datetime-local"> like "2025-06-19T10:30"
  if (!s) return null;
  const d = new Date(s); // interprets as local time
  return d.toISOString(); // store as timestamptz
}

export async function createBookingAction(formData: FormData) {
  const { userId, orgId } = await auth();
  if (!userId) throw new Error("Not signed in.");
  if (!orgId) throw new Error("No active organisation.");

  const supabase = await getServerSupabaseClient();

  const assetId = String(formData.get("assetId") ?? "");
  const bookingType = String(formData.get("bookingType") ?? "drop-off");
  const startLocal = String(formData.get("startAt") ?? "");
  const endLocal = (formData.get("endAt") as string) || null;
  const toLocationId = (formData.get("toLocationId") as string) || null;
  const toZoneId = (formData.get("toZoneId") as string) || null;
  const fromLocationId = (formData.get("fromLocationId") as string) || null;
  const fromZoneId = (formData.get("fromZoneId") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  let prepRequested: Record<string, unknown> | null = null;
  const prepRaw = formData.get("prepRequested");
  if (typeof prepRaw === "string" && prepRaw.trim() !== "") {
    try {
      const parsed = JSON.parse(prepRaw);
      if (parsed && typeof parsed === "object") prepRequested = parsed;
    } catch {
      /* ignore bad JSON, keep null */
    }
  }

  if (!assetId) throw new Error("assetId required.");
  if (!startLocal) throw new Error("Start date/time required.");

  const scheduled_start_at = parseLocalDateTimeToISO(startLocal);
  const scheduled_end_at = parseLocalDateTimeToISO(endLocal);

  // derive client_id from asset for safety
  const { data: asset, error: assetErr } = await supabase
    .from("assets")
    .select("id, client_id")
    .eq("id", assetId)
    .is("deleted_at", null)
    .maybeSingle();
  if (assetErr) throw assetErr;
  if (!asset) throw new Error("Asset not found.");
  const clientId = asset.client_id;
  const payload = {
    asset_id: assetId,
    client_id: clientId,
    booking_type: bookingType,
    status: "requested",
    scheduled_start_at,
    scheduled_end_at,
    notes,
    to_location_id: toLocationId,
    to_location_zone_id: toZoneId,
    from_location_id: fromLocationId,
    from_location_zone_id: fromZoneId,
    prep_requested: prepRequested,
  };

  const { error } = await supabase.from("asset_bookings").insert(payload);
  if (error) {
    // Friendly overlap message
    if (error.message?.includes("asset_bookings_no_overlap")) {
      throw new Error(
        "This asset already has an overlapping active booking in that time window.",
      );
    }
    throw error;
  }

  revalidatePath("/bookings");
}

export async function updateBookingStatusAction(input: {
  id: string;
  status: BookingStatus;
}) {
  const { id, status } = input;
  const { orgId } = await auth();
  if (!orgId) throw new Error("No active organisation.");

  const supabase = await getServerSupabaseClient();

  const { error } = await supabase
    .from("asset_bookings")
    .update({ status })
    .eq("id", id)
    .eq("clerk_organisation_id", orgId)
    .is("deleted_at", null);

  if (error) throw error;

  revalidatePath("/bookings");
}

export async function deleteBookingAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id required.");

  const { orgId } = await auth();
  if (!orgId) throw new Error("No active organisation.");

  const supabase = await getServerSupabaseClient();

  const { error } = await supabase
    .from("asset_bookings")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("clerk_organisation_id", orgId)
    .is("deleted_at", null);

  if (error) throw error;

  revalidatePath("/bookings");
}
