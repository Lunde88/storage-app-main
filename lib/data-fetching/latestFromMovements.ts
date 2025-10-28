import { SupabaseClient } from "@supabase/supabase-js";

type LatestMovementRow = {
  id: string;
  event_type: "check-in" | "check-out" | "transfer";
  movement_time: string; // timestamptz
  created_at: string;
  from_location?: { id: string; name: string }[] | null;
  to_location?: { id: string; name: string }[] | null;
};

const EVENT_TO_STATUS = {
  "check-in": "in_storage",
  transfer: "in_storage",
  "check-out": "checked_out",
} as const;

function one<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export async function fetchLatestStatusFromMovements(
  supabase: SupabaseClient,
  assetId: string,
) {
  const { data, error } = await supabase
    .from("asset_movements")
    .select(
      `
        id,
        event_type,
        movement_time,
        created_at,
        from_location:locations!asset_movements_from_location_id_fkey ( id, name ),
        to_location:locations!asset_movements_to_location_id_fkey ( id, name )
      `,
    )
    .eq("asset_id", assetId)
    // deterministic latest row:
    .order("movement_time", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .overrideTypes<LatestMovementRow[], { merge: false }>();

  if (error || !data || data.length === 0) {
    // If no movement rows are visible (RLS?), treat as checked out
    return { isCheckedIn: false, latest: null };
  }

  const latest = data[0];
  const isCheckedIn = latest
    ? EVENT_TO_STATUS[latest.event_type] === "in_storage"
    : false;

  return {
    isCheckedIn,
    latest: {
      ...latest,
      from_location: one(latest.from_location),
      to_location: one(latest.to_location),
    },
  };
}
