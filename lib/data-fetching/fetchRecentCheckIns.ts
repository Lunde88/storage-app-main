// lib/fetchRecentCheckIns.ts
// import { supabase } from "@/lib/supabaseClient";
// import { keysToCamelCase } from "@/utils/case";
// import { RecentCheckIn } from "../types";

// export async function fetchRecentCheckIns(
//   limit = 10
// ): Promise<RecentCheckIn[]> {
//   const { data, error } = await supabase
//     .from("recent_checkins")
//     .select("*")
//     .limit(limit);

//   if (error) throw error;
//   return keysToCamelCase(data ?? []) as RecentCheckIn[];
// }

import { SupabaseClient } from "@supabase/supabase-js";
import { keysToCamelCase } from "@/utils/case";
import { RecentCheckIn } from "../types";

export async function fetchRecentCheckIns(
  supabase: SupabaseClient,
  limit = 10,
): Promise<RecentCheckIn[]> {
  const { data, error } = await supabase
    .from("current_assets_in_storage")
    .select("*")
    .order("last_checkin_time", { ascending: false }) // descending (most recent first)
    .limit(limit);

  if (error) throw error;
  return keysToCamelCase(data ?? []) as RecentCheckIn[];
}
