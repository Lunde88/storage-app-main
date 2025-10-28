// lib/data-fetching/contractsReport.ts
import { SupabaseClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

// Shape you want after the query
export type ContractRow = {
  id: string;
  asset_id: string;
  client_id: string;
  monthly_rate: number;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  asset: {
    id: string;
    identifier: string | null;
    make: string | null;
    model: string | null;
    location?: { id: string; name: string | null } | null;
  } | null;
  client: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
  } | null;
  contract_location: { id: string; name: string | null } | null;
  contract_zone?: { id: string; name: string | null } | null;
};

export async function fetchOrgContracts(
  supabase: SupabaseClient,
): Promise<ContractRow[]> {
  const { orgId } = await auth();
  if (!orgId) throw new Error("No active organisation");

  const { data, error } = await supabase
    .from("storage_contracts")
    .select(
      `
      id, asset_id, client_id, monthly_rate, start_date, end_date, created_at, updated_at,
      asset:assets!storage_contracts_asset_fk (
        id, identifier, make, model,
        location:locations!assets_location_fk ( id, name )
      ),
      client:clients!storage_contracts_client_fk ( id, first_name, last_name, company_name ),
       contract_location:locations!storage_contracts_location_fk ( id, name ),
      contract_zone:location_zones!storage_contracts_location_zone_fk ( id, name )
    `,
    )
    .eq("clerk_organisation_id", orgId)
    .is("deleted_at", null)
    .order("start_date", { ascending: false })
    .overrideTypes<ContractRow[], { merge: false }>();

  if (error) throw error;
  return data ?? [];
}
