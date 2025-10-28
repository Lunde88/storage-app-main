// import { SupabaseClient } from "@supabase/supabase-js";

// type RawLoc = { id: string; name: string };
// type RawZone = { id: string; name: string };

// type RawUser = {
//   clerk_user_id: string;
//   full_name?: string | null;
//   email?: string | null;
// };

// type RawRow = {
//   id: string;
//   event_type: string;
//   movement_time: string;
//   notes: string | null;

//   from_location_id: string | null;
//   to_location_id: string | null;

//   // NEW: zone ids (present on your asset_movements)
//   from_location_zone_id?: string | null;
//   to_location_zone_id?: string | null;

//   from_location?: RawLoc | RawLoc[] | null;
//   to_location?: RawLoc | RawLoc[] | null;

//   // NEW: joined zone rows
//   from_location_zone?: RawZone | RawZone[] | null;
//   to_location_zone?: RawZone | RawZone[] | null;

//   created_by_user?: RawUser | RawUser[] | null;
// };

// export type Movement = {
//   id: string;
//   eventType: string;
//   movementTime: string;
//   notes: string | null;

//   fromLocationId: string | null;
//   toLocationId: string | null;

//   fromLocation: { id: string; name: string } | null;
//   toLocation: { id: string; name: string } | null;

//   // NEW: zones (nullable)
//   fromLocationZone: { id: string; name: string } | null;
//   toLocationZone: { id: string; name: string } | null;

//   createdByUser: { id: string; label: string } | null;
// };

// const one = <T>(v: T | T[] | null | undefined): T | null =>
//   !v ? null : Array.isArray(v) ? (v[0] ?? null) : v;

// export async function fetchMovementHistoryDirect(
//   supabase: SupabaseClient,
//   assetId: string,
// ): Promise<Movement[]> {
//   const { data, error, status, statusText } = await supabase
//     .from("asset_movements")
//     .select(
//       `
//     id,
//     event_type,
//     movement_time,
//     notes,

//     from_location_id,
//     to_location_id,
//     from_location_zone_id,
//     to_location_zone_id,

//     from_location:locations!asset_movements_from_location_id_fkey ( id, name ),
//     to_location:locations!asset_movements_to_location_id_fkey ( id, name ),

//     from_location_zone:location_zones!asset_movements_from_location_zone_id_fkey ( id, name ),
//     to_location_zone:location_zones!asset_movements_to_location_zone_id_fkey ( id, name ),

//     created_by_user:users!asset_movements_created_by_fkey ( clerk_user_id, full_name, email )
//   `,
//     )
//     .eq("asset_id", assetId)
//     .order("movement_time", { ascending: false })
//     .order("created_at", { ascending: false })
//     .order("id", { ascending: false })
//     .overrideTypes<RawRow[], { merge: false }>();

//   if (error) {
//     console.error(
//       "fetchMovementHistoryDirect error:",
//       JSON.stringify(
//         {
//           status,
//           statusText,
//           code: error?.code,
//           message: error?.message,
//           details: error?.details,
//           hint: error?.hint,
//         },
//         null,
//         2,
//       ),
//     );
//     return [];
//   }

//   return (data ?? []).map((r) => {
//     const u = one(r.created_by_user);
//     const label = u?.full_name ?? u?.email ?? u?.clerk_user_id ?? "";

//     const fromLocation = one(r.from_location);
//     const toLocation = one(r.to_location);

//     const fromLocationZone = one(r.from_location_zone);
//     const toLocationZone = one(r.to_location_zone);

//     return {
//       id: r.id,
//       eventType: r.event_type,
//       movementTime: r.movement_time,
//       notes: r.notes,

//       fromLocationId: r.from_location_id,
//       toLocationId: r.to_location_id,

//       fromLocation: fromLocation
//         ? { id: fromLocation.id, name: fromLocation.name }
//         : null,
//       toLocation: toLocation
//         ? { id: toLocation.id, name: toLocation.name }
//         : null,

//       // NEW
//       fromLocationZone: fromLocationZone
//         ? { id: fromLocationZone.id, name: fromLocationZone.name }
//         : null,
//       toLocationZone: toLocationZone
//         ? { id: toLocationZone.id, name: toLocationZone.name }
//         : null,

//       createdByUser: u ? { id: u.clerk_user_id, label } : null,
//     };
//   });
// }
import { SupabaseClient } from "@supabase/supabase-js";

type RawLoc = { id: string; name: string };
type RawZone = { id: string; name: string };

type RawUser = {
  id: string; // ← users.id (uuid)
  full_name?: string | null;
  email?: string | null;
};

type RawRow = {
  id: string;
  event_type: string;
  movement_time: string;
  notes: string | null;

  from_location_id: string | null;
  to_location_id: string | null;

  from_location_zone_id?: string | null;
  to_location_zone_id?: string | null;

  from_location?: RawLoc | RawLoc[] | null;
  to_location?: RawLoc | RawLoc[] | null;

  from_location_zone?: RawZone | RawZone[] | null;
  to_location_zone?: RawZone | RawZone[] | null;

  created_by_user?: RawUser | RawUser[] | null;
};

export type Movement = {
  id: string;
  eventType: string;
  movementTime: string;
  notes: string | null;

  fromLocationId: string | null;
  toLocationId: string | null;

  fromLocation: { id: string; name: string } | null;
  toLocation: { id: string; name: string } | null;

  fromLocationZone: { id: string; name: string } | null;
  toLocationZone: { id: string; name: string } | null;

  createdByUser: { id: string; label: string } | null;
};

const one = <T>(v: T | T[] | null | undefined): T | null =>
  !v ? null : Array.isArray(v) ? (v[0] ?? null) : v;

export async function fetchMovementHistoryDirect(
  supabase: SupabaseClient,
  assetId: string,
): Promise<Movement[]> {
  const { data, error, status, statusText } = await supabase
    .from("asset_movements")
    .select(
      `
        id,
        event_type,
        movement_time,
        notes,

        from_location_id,
        to_location_id,
        from_location_zone_id,
        to_location_zone_id,

        from_location:locations!asset_movements_from_location_fk ( id, name ),
        to_location:locations!asset_movements_to_location_fk ( id, name ),

        from_location_zone:location_zones!asset_movements_from_location_zone_fk ( id, name ),
        to_location_zone:location_zones!asset_movements_to_location_zone_fk ( id, name ),

        created_by_user:users!asset_movements_created_by_user_fk ( id, full_name, email )
      `,
    )
    .eq("asset_id", assetId)
    .is("deleted_at", null) // ← soft-delete guard
    .order("movement_time", { ascending: false })
    .order("id", { ascending: false })
    .overrideTypes<RawRow[], { merge: false }>();

  if (error) {
    console.error(
      "fetchMovementHistoryDirect error:",
      JSON.stringify(
        {
          status,
          statusText,
          code: error?.code,
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
        },
        null,
        2,
      ),
    );
    return [];
  }

  return (data ?? []).map((r) => {
    const u = one(r.created_by_user);
    const fromLocation = one(r.from_location);
    const toLocation = one(r.to_location);
    const fromLocationZone = one(r.from_location_zone);
    const toLocationZone = one(r.to_location_zone);

    const label = u?.full_name ?? u?.email ?? u?.id ?? "";

    return {
      id: r.id,
      eventType: r.event_type,
      movementTime: r.movement_time,
      notes: r.notes,

      fromLocationId: r.from_location_id,
      toLocationId: r.to_location_id,

      fromLocation: fromLocation
        ? { id: fromLocation.id, name: fromLocation.name }
        : null,
      toLocation: toLocation
        ? { id: toLocation.id, name: toLocation.name }
        : null,

      fromLocationZone: fromLocationZone
        ? { id: fromLocationZone.id, name: fromLocationZone.name }
        : null,
      toLocationZone: toLocationZone
        ? { id: toLocationZone.id, name: toLocationZone.name }
        : null,

      createdByUser: u ? { id: u.id, label } : null,
    };
  });
}
