// lib/server-actions/contracts.ts
"use server";

import { getServerSupabaseClient } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

// --- helpers: local YYYY-MM-DD (no timezone conversions) ---
function ymdLocal(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function createContractAction(formData: FormData) {
  const assetId = String(formData.get("assetId") ?? "");
  const clientId = String(formData.get("clientId") ?? "");
  const locationId = String(formData.get("locationId") ?? "");
  const locationZoneId = (formData.get("locationZoneId") as string) || null;
  const monthlyRate = Number(formData.get("monthlyRate") ?? 0);

  // IMPORTANT: this must already be a date-only string from the client
  // (ContractForm should send formatYmdLocal(startDate), NOT toISOString())
  const startDate = String(formData.get("startDate") ?? "");

  if (!assetId) throw new Error("assetId required");
  if (!clientId) throw new Error("Client is required to create a contract.");
  if (!locationId) throw new Error("Location is required.");
  if (!startDate) throw new Error("startDate required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    throw new Error("Invalid start date format; expected YYYY-MM-DD.");
  }
  if (!Number.isFinite(monthlyRate) || monthlyRate < 0) {
    throw new Error("Monthly rate must be a positive number.");
  }

  const supabase = await getServerSupabaseClient();
  const { userId, orgId } = await auth();
  if (!userId) throw new Error("Not signed in");
  if (!orgId) throw new Error("No active organisation");

  const { error } = await supabase.from("storage_contracts").insert({
    asset_id: assetId,
    client_id: clientId,
    monthly_rate: monthlyRate,
    start_date: startDate, // <- already date-only
    location_id: locationId,
    location_zone_id: locationZoneId,
  });

  if (error) {
    if (error.code === "23P01") {
      throw new Error(
        "A contract already covers this period. End the current contract before adding a new one.",
      );
    }
    throw error;
  }

  revalidatePath(`/vehicle/${assetId}/contracts`);
  redirect(`/vehicle/${assetId}/contracts`);
}

export async function endContractAction(input: {
  contractId: string;
  assetId: string;
  endDate: string; // YYYY-MM-DD (from client)
}) {
  const supabase = await getServerSupabaseClient();
  const { orgId } = await auth();
  if (!orgId) throw new Error("No active organisation found.");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.endDate)) {
    throw new Error("Invalid end date format; expected YYYY-MM-DD.");
  }

  const { error } = await supabase
    .from("storage_contracts")
    .update({ end_date: input.endDate }) // date-only
    .eq("id", input.contractId)
    .eq("asset_id", input.assetId)
    .eq("clerk_organisation_id", orgId)
    .is("deleted_at", null);

  if (error) throw error;

  revalidatePath(`/vehicle/${input.assetId}/contracts`);
  revalidatePath(`/vehicle/${input.assetId}/contracts/${input.contractId}`);
}

export async function cancelScheduledContractAction(formData: FormData) {
  const contractId = String(formData.get("contractId") ?? "");
  const assetId = String(formData.get("assetId") ?? "");
  if (!contractId || !assetId) throw new Error("Missing contract or asset id.");

  const supabase = await getServerSupabaseClient();
  const { orgId } = await auth();
  if (!orgId) throw new Error("No active organisation.");

  const { data: c, error: fetchErr } = await supabase
    .from("storage_contracts")
    .select("id, start_date, end_date, clerk_organisation_id, deleted_at")
    .eq("id", contractId)
    .eq("clerk_organisation_id", orgId)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!c) throw new Error("Contract not found.");
  if (c.deleted_at) throw new Error("Contract already cancelled.");

  // Compare using local date-only string (avoid UTC midnight shift)
  const today = ymdLocal();
  if (!(c.start_date > today)) {
    throw new Error("Only scheduled (future) contracts can be cancelled.");
  }

  const { error } = await supabase
    .from("storage_contracts")
    .update({ deleted_at: new Date().toISOString() }) // timestamp is fine here
    .eq("id", contractId)
    .eq("clerk_organisation_id", orgId);

  if (error) throw error;

  revalidatePath(`/vehicle/${assetId}/contracts`);
  redirect(`/vehicle/${assetId}/contracts`);
}
