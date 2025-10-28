"use server";

import { auth } from "@clerk/nextjs/server";
import { getServerSupabaseClient } from "@/lib/supabaseServer";

type OrgPatch = {
  name?: string;
  address?: string | null;
  contactEmail?: string | null;
  phone?: string | null;
};

export async function loadOrganisation() {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authorised");
  const sb = await getServerSupabaseClient();

  const { data, error } = await sb
    .from("organisations")
    .select(
      "id, name, address, contact_email, phone, clerk_organisation_id, settings",
    )
    .eq("clerk_organisation_id", orgId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Organisation not found");
  return data;
}

export async function updateOrganisation(patch: OrgPatch) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authorised");
  const sb = await getServerSupabaseClient();

  const { error } = await sb
    .from("organisations")
    .update({
      name: patch.name,
      address: patch.address ?? null,
      contact_email: patch.contactEmail ?? null,
      phone: patch.phone ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("clerk_organisation_id", orgId);

  if (error) throw error;
  return { ok: true };
}
