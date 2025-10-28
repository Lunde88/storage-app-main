import SearchAnythingInline from "@/components/search/SearchAnythingInline";
import CheckedInVehiclesGrid, {
  type CheckedInVehicle,
  type LocationOption,
} from "@/components/checkout/CheckedInVehiclesGrid";
import { getServerSupabaseClient } from "@/lib/supabaseServer";
import { SupabaseClient } from "@supabase/supabase-js";

type CheckedInVehicleRow = {
  id: string;
  client_id: string | null;
  identifier: string | null;
  make: string | null;
  model: string | null;
  colour: string | null;
  year: number | null;
  asset_type: string | null;
  vehicle_type: string | null;
  vin_number: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_checked_in: boolean | null;
  last_event_type: "check-in" | "check-out" | "transfer" | null;
  last_movement_time: string | null;
};

type ClientRow = {
  id: string;
  label: string | null;
};

type LastMovementRow = {
  id: string;
  asset_id: string;
  to_location_id: string | null;
  to_location_zone_id: string | null;
  to_location: { id: string; name: string | null } | null;
  to_location_zone: { id: string; name: string | null } | null;
};

async function fetchCheckedInVehicles(
  supabase: SupabaseClient,
): Promise<CheckedInVehicle[]> {
  const { data, error } = await supabase
    .from("assets_with_latest_event")
    .select(
      `
      id,
      client_id,
      identifier,
      make,
      model,
      colour,
      year,
      asset_type,
      vehicle_type,
      vin_number,
      notes,
      created_at,
      updated_at,
      is_checked_in,
      last_event_type,
      last_movement_time
    `,
    )
    .eq("is_checked_in", true)
    .order("last_movement_time", { ascending: false })
    .overrideTypes<CheckedInVehicleRow[], { merge: false }>();

  if (error) throw error;
  const rows = data ?? [];

  if (rows.length === 0) {
    return [];
  }

  const assetIds = rows
    .map((row) => row.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  const clientIds = Array.from(
    new Set(
      rows
        .map((row) => row.client_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  );

  const [lastMovementsResult, clientsResult] = await Promise.all([
    fetchLastMovementDetails(supabase, assetIds),
    fetchClientLabels(supabase, clientIds),
  ]);

  const lastMovementByAssetId = new Map<string, LastMovementRow>();
  for (const movement of lastMovementsResult) {
    lastMovementByAssetId.set(movement.asset_id, movement);
  }

  const clientLabelById = new Map<string, string | null>(
    clientsResult.map((row) => [row.id, row.label ?? null]),
  );

  return rows.map((row) => {
    const lastMovement = lastMovementByAssetId.get(row.id);
    const locationId = lastMovement?.to_location_id ?? null;
    const locationName =
      lastMovement?.to_location?.name ?? lastMovement?.to_location?.id ?? null;
    const zoneId = lastMovement?.to_location_zone_id ?? null;
    const zoneName = lastMovement?.to_location_zone?.name ?? null;

    return {
      id: row.id,
      clientId: row.client_id,
      clientLabel: row.client_id
        ? (clientLabelById.get(row.client_id) ?? null)
        : null,
      identifier: row.identifier ?? "",
      make: row.make,
      model: row.model,
      colour: row.colour,
      year: row.year,
      assetType: row.asset_type,
      vehicleType: row.vehicle_type,
      vinNumber: row.vin_number,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isCheckedIn: row.is_checked_in ?? false,
      lastEventType: row.last_event_type,
      lastMovementTime: row.last_movement_time,
      lastLocationId: locationId,
      lastLocationName: locationName,
      lastLocationZoneId: zoneId,
      lastLocationZoneName: zoneName,
    } satisfies CheckedInVehicle;
  });
}

async function fetchClientLabels(
  supabase: SupabaseClient,
  clientIds: string[],
): Promise<ClientRow[]> {
  if (clientIds.length === 0) return [];

  const { data, error } = await supabase
    .from("clients")
    .select("id, label")
    .in("id", clientIds)
    .overrideTypes<ClientRow[], { merge: false }>();

  if (error) throw error;
  return data ?? [];
}

async function fetchLastMovementDetails(
  supabase: SupabaseClient,
  assetIds: string[],
): Promise<LastMovementRow[]> {
  if (assetIds.length === 0) return [];

  const { data, error } = await supabase
    .from("asset_movements")
    .select(
      `
      id,
      asset_id,
      to_location_id,
      to_location_zone_id,
      movement_time,
      to_location:locations!asset_movements_to_location_fk ( id, name ),
      to_location_zone:location_zones!asset_movements_to_location_zone_fk ( id, name )
    `,
    )
    .in("asset_id", assetIds)
    .order("movement_time", { ascending: false })
    .order("id", { ascending: false })
    .overrideTypes<
      (LastMovementRow & { movement_time: string | null })[],
      { merge: false }
    >();

  if (error) throw error;

  const latestByAsset = new Map<string, LastMovementRow>();
  for (const row of data ?? []) {
    if (!latestByAsset.has(row.asset_id)) {
      const { movement_time: _movementTime, ...rest } = row;
      void _movementTime;
      latestByAsset.set(row.asset_id, rest as LastMovementRow);
    }
  }

  return Array.from(latestByAsset.values());
}

async function fetchActiveLocations(
  supabase: SupabaseClient,
): Promise<LocationOption[]> {
  const { data, error } = await supabase
    .from("locations")
    .select("id, name")
    .is("deleted_at", null)
    .order("name", { ascending: true })
    .overrideTypes<{ id: string; name: string }[], { merge: false }>();

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
  }));
}

export default async function CheckOutPage() {
  const supabase = await getServerSupabaseClient();
  const [vehicles, locations] = await Promise.all([
    fetchCheckedInVehicles(supabase),
    fetchActiveLocations(supabase),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6">
        <section className="rounded-3xl border border-black/5 bg-gradient-to-br from-[#F5F5FF] via-white to-[#F4FBFF] p-8 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl space-y-4">
              <div>
                <p className="text-sm font-semibold tracking-wide text-blue-600 uppercase">
                  Check-out hub
                </p>
                <h1 className="font-heading text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
                  Handover vehicles with confidence
                </h1>
              </div>
              <p className="text-muted-foreground max-w-xl text-base">
                Review vehicles currently on-site, filter by location or recent
                movement, and jump straight into the guided check-out flow.
              </p>
            </div>
            <div className="w-full max-w-md md:w-auto">
              <SearchAnythingInline />
            </div>
          </div>
        </section>
      </div>

      <CheckedInVehiclesGrid vehicles={vehicles} locations={locations} />
    </main>
  );
}
