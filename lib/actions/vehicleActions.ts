// "use server";

// import { getServerSupabaseClient } from "@/lib/supabaseServer";
// import { auth } from "@clerk/nextjs/server";
// import { cleanseAssetForDB } from "@/lib/cleanseForDB";
// import { AssetInput } from "@/lib/types";

// export async function insertVehicle(
//   vehicleInput: AssetInput,
//   clientId: string,
// ) {
//   const { userId, orgId } = await auth();
//   if (!userId || !orgId) throw new Error("Not authorised");

//   // Use provided clienId
//   if (!clientId) throw new Error("ClientId is required for vehicle insert");

//   // Create Supabase client
//   const supabase = await getServerSupabaseClient();

//   // Validate that the client exists and belongs to this organisation!
//   const { data: clientData, error: clientError } = await supabase
//     .from("clients")
//     .select("id")
//     .eq("id", clientId)
//     .eq("clerk_organisation_id", orgId)
//     .single();

//   if (clientError || !clientData) {
//     throw new Error("Client not found or not in your organisation");
//   }

//   // Compose the asset object (never trust the client for critical IDs)
//   const newAsset = {
//     ...vehicleInput,
//     clientId,
//     createdBy: userId,
//     clerkOrganisationId: orgId,
//   };

//   // Clean out blank fields, camel->snake if needed
//   const dbAsset = cleanseAssetForDB(newAsset);
//   // 1) Insert and request aliased (camelCase) columns back
//   const { data: inserted, error } = await supabase
//     .from("assets")
//     .insert([dbAsset])
//     .select(
//       `
//       id,
//       clientId:client_id,
//       identifier,
//       make,
//       model,
//       colour,
//       year,
//       assetType:asset_type,
//       vehicleType:vehicle_type,
//       vinNumber:vin_number,
//       notes,
//        createdBy:created_by,
//       createdAt:created_at,
//       updatedAt:updated_at,
//       clerkOrganisationId:clerk_organisation_id
//     `,
//     )
//     .single();

//   if (error || !inserted?.id) throw error || new Error("Asset insert failed");

//   // 2) Enrich with latest status (so the next step has everything it needs)
//   const { data: status } = await supabase
//     .from("assets_with_latest_event")
//     .select(
//       `
//       isCheckedIn:is_checked_in,
//       lastEventType:last_event_type,
//       lastMovementTime:last_movement_time
//     `,
//     )
//     .eq("id", inserted.id)
//     .single();

//   // 3) Ensure assetType / vehicleType are present even if DB returned null
//   return {
//     ...inserted,
//     assetType: inserted.assetType ?? vehicleInput.assetType,
//     vehicleType: inserted.vehicleType ?? vehicleInput.vehicleType,
//     isCheckedIn: status?.isCheckedIn ?? false,
//     lastEventType: status?.lastEventType ?? null,
//     lastMovementTime: status?.lastMovementTime ?? null,
//   };
// }

// lib/actions/vehicleActions.ts
// lib/actions/vehicleActions.ts
"use server";

import { getServerSupabaseClient } from "@/lib/supabaseServer";
import { auth } from "@clerk/nextjs/server";
import { AssetInsertInput, cleanseAssetInsertForDB } from "../cleanseForDB";

export async function insertVehicle(vehicleInput: AssetInsertInput) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) throw new Error("Not authorised");

  const supabase = await getServerSupabaseClient();

  // Validate the client belongs to the org
  const { data: clientData, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("id", vehicleInput.clientId)
    .eq("clerk_organisation_id", orgId)
    .single();
  if (clientError || !clientData) {
    throw new Error("Client not found or not in your organisation");
  }

  // Compose the DB payload (DB defaults will set org + created_by_user_id)
  const dbAsset = cleanseAssetInsertForDB({
    ...vehicleInput,
    // do NOT add createdByUserId / clerkOrganisationId here;
    // they come from DB defaults + JWT claims
  });

  const { data: inserted, error } = await supabase
    .from("assets")
    .insert([dbAsset])
    .select(
      `
      id,
      clientId:client_id,
      identifier,
      make,
      model,
      colour,
      year,
      assetType:asset_type,
      vehicleType:vehicle_type,
      vinNumber:vin_number,
      notes,
       createdByUserId:created_by_user_id,
      createdAt:created_at,
      updatedAt:updated_at,
      clerkOrganisationId:clerk_organisation_id
    `,
    )
    .single();
  if (error || !inserted?.id) throw error || new Error("Asset insert failed");

  // Enrich with latest status
  const { data: status } = await supabase
    .from("assets_with_latest_event")
    .select(
      `
      isCheckedIn:is_checked_in,
      lastEventType:last_event_type,
      lastMovementTime:last_movement_time
    `,
    )
    .eq("id", inserted.id)
    .single();

  return {
    ...inserted,
    assetType: inserted.assetType ?? vehicleInput.assetType,
    vehicleType: inserted.vehicleType ?? vehicleInput.vehicleType,
    isCheckedIn: status?.isCheckedIn ?? false,
    lastEventType: status?.lastEventType ?? null,
    lastMovementTime: status?.lastMovementTime ?? null,
  };
}
