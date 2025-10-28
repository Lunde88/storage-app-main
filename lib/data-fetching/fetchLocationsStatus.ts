import { SupabaseClient } from "@supabase/supabase-js";
import { LocationStorageStatus } from "../types";

export async function fetchLocationsStatus(
  supabase: SupabaseClient,
  limit = 10,
): Promise<LocationStorageStatus[]> {
  const { data, error } = await supabase
    .from("location_storage_summary")
    .select(
      "locationId:location_id, name, label, capacity, occupied, spacesAvailable:spaces_available",
    )
    .order("name", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
