// lib/actions/locationActions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { getServerSupabaseClient } from "@/lib/supabaseServer";

export type LocationInput = {
  name: string;
  label?: string | null;
  address?: string | null;
  phone?: string | null;
  contactName?: string | null;
  notes?: string | null;
  capacity?: number | null;
};

export async function listLocationsWithZones() {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authorised");
  const supabase = await getServerSupabaseClient();

  const { data, error } = await supabase
    .from("locations")
    .select(
      `
      id, name, label, address, phone, contact_name, notes, capacity, created_at,
      location_zones ( id, name, sort_order )
    `,
    )
    .eq("clerk_organisation_id", orgId)
    .is("deleted_at", null)
    .order("name", { ascending: true })
    .order("sort_order", {
      referencedTable: "location_zones",
      ascending: true,
    });

  if (error) throw error;
  return data ?? [];
}

/* LOCATIONS */

export async function createLocation(input: LocationInput) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authorised");
  const supabase = await getServerSupabaseClient();

  const { data, error } = await supabase
    .from("locations")
    .insert([
      {
        name: input.name,
        label: input.label ?? input.name,
        address: input.address ?? null,
        phone: input.phone ?? null,
        contact_name: input.contactName ?? null,
        notes: input.notes ?? null,
        capacity: input.capacity ?? 0,
        clerk_organisation_id: orgId,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateLocation(id: string, input: LocationInput) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authorised");
  const supabase = await getServerSupabaseClient();

  // guard org
  const { error: guardErr } = await supabase
    .from("locations")
    .select("id")
    .eq("id", id)
    .eq("clerk_organisation_id", orgId)
    .is("deleted_at", null)
    .maybeSingle();
  if (guardErr) throw new Error("Location not found or not permitted");

  const { data, error } = await supabase
    .from("locations")
    .update({
      name: input.name,
      label: input.label ?? input.name,
      address: input.address ?? null,
      phone: input.phone ?? null,
      contact_name: input.contactName ?? null,
      notes: input.notes ?? null,
      capacity: input.capacity ?? 0,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Soft delete
export async function deleteLocation(id: string) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authorised");
  const supabase = await getServerSupabaseClient();

  const { error } = await supabase
    .from("locations")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("clerk_organisation_id", orgId);

  if (error) throw error;
  return { ok: true };
}

/* ZONES (sub-locations) */

export async function createZone(locationId: string, name: string) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authorised");
  const supabase = await getServerSupabaseClient();

  // derive next sort_order
  const { data: maxRow } = await supabase
    .from("location_zones")
    .select("sort_order")
    .eq("location_id", locationId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const clean = name.trim();
  if (!clean) throw new Error("Zone name required");

  const next = (maxRow?.sort_order ?? 0) + 1;

  const { data, error } = await supabase
    .from("location_zones")
    .insert([
      { location_id: locationId, name: clean, label: clean, sort_order: next },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateZone(id: string, name: string) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authorised");
  const supabase = await getServerSupabaseClient();

  const clean = name.trim();
  if (!clean) throw new Error("Zone name required");

  const { data, error } = await supabase
    .from("location_zones")
    .update({ name: clean, label: clean })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteZone(id: string) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authorised");
  const supabase = await getServerSupabaseClient();

  const { error } = await supabase.from("location_zones").delete().eq("id", id);
  if (error) throw error;
  return { ok: true };
}

export async function reorderZones(
  locationId: string,
  orderedZoneIds: string[],
) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authorised");
  const supabase = await getServerSupabaseClient();

  // apply increasing sort_order according to incoming order
  const updates = orderedZoneIds.map((id, idx) =>
    supabase
      .from("location_zones")
      .update({ sort_order: idx + 1 })
      .eq("id", id)
      .eq("location_id", locationId),
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
  return { ok: true };
}
