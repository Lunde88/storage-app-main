// import { SupabaseClient } from "@supabase/supabase-js";
// import { keysToCamelCase } from "@/utils/case";
// import { LatestAssetEvent } from "../types";

// export async function fetchLatestAssetEvent(
//   supabase: SupabaseClient,
//   limit = 10,
// ): Promise<LatestAssetEvent[]> {
//   const { data, error } = await supabase
//     .from("latest_asset_event")
//     .select("*")
//     .order("last_movement_time", { ascending: false })
//     .limit(limit);

//   if (error) throw error;
//   return keysToCamelCase(data ?? []) as LatestAssetEvent[];
// }

// To filter by type:
// Only check-ins:
// select * from latest_asset_event where last_event_type = 'check-in';
// Only check-outs:
// select * from latest_asset_event where last_event_type = 'check-out';

import { SupabaseClient } from "@supabase/supabase-js";

import { LatestAssetEvent } from "../types";

type EventTypeFilter = "all" | "check-in" | "check-out";

export async function fetchLatestAssetEvent(
  supabase: SupabaseClient,
  limit = 10,
  type: EventTypeFilter = "all",
): Promise<LatestAssetEvent[]> {
  let query = supabase
    .from("latest_asset_event_detailed")
    .select(
      `
      assetId:asset_id,
      lastEventId:last_event_id,
      lastEventType:last_event_type,
      lastMovementTime:last_movement_time,
      identifier, make, model, colour, year,
      clientId:client_id,
      client
    `,
    )
    .not("last_event_id", "is", null)
    .order("last_movement_time", { ascending: false })
    .limit(limit);

  if (type !== "all") {
    query = query.eq("last_event_type", type);
  }

  const { data, error } = await query.overrideTypes<
    LatestAssetEvent[],
    { merge: false }
  >();

  if (error) throw error;
  return data ?? [];
}
