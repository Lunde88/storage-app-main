// app/vehicle/[id]/check-out/page.tsx
import { notFound } from "next/navigation";
import { SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabaseClient } from "@/lib/supabaseServer";
import { keysToCamelCase } from "@/utils/case";
import CheckOutWizardPage from "@/components/checkout/CheckOutWizardPage";
import { VEHICLE_TYPES, VehicleType } from "@/lib/types";

// --- Types matching your camelCased utils ---
type VehicleRow = {
  id: string;
  identifier: string;
  assetType: string | null;
  vehicleType: string | null;
  make: string | null;
  model: string | null;
  colour: string | null;
  notes: string | null;
  client: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  location: {
    id: string;
    name: string;
  } | null;
};

type CurrentLocRow = {
  event_type: "check-in" | "check-out" | "transfer";
  movement_time: string;
  to_location_id: string | null;
  to_location: { id: string; name: string } | null;
  to_location_zone_id: string | null;
  to_zone: { id: string; name: string } | null;
};

// Helper: convert unknown string -> VehicleType | null
function toVehicleType(v: string | null | undefined): VehicleType | null {
  return v && (VEHICLE_TYPES as readonly string[]).includes(v)
    ? (v as VehicleType)
    : null;
}

// --- Helpers copied/adapted from your vehicle page ---
async function getVehicleAndClient(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("assets")
    .select(
      `
      *,
      client:clients (
        id, first_name, last_name, company_name, email, phone
      ),
      location:locations (
        id, name
      )
    `,
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return null;
  return keysToCamelCase<VehicleRow>(data);
}

async function getCurrentLocation(supabase: SupabaseClient, assetId: string) {
  const { data: m } = await supabase
    .from("asset_movements")
    .select(
      `
      event_type,
      movement_time,
      to_location_id,
      to_location:locations!asset_movements_to_location_fk ( id, name ),
      to_location_zone_id,
      to_zone:location_zones!asset_movements_to_location_zone_fk ( id, name )
    `,
    )
    .eq("asset_id", assetId)
    .is("deleted_at", null)
    .order("movement_time", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle()
    .overrideTypes<CurrentLocRow | null, { merge: false }>();

  const hasHistory = !!m;
  const eventType =
    (m?.event_type as "check-in" | "check-out" | "transfer") ?? null;
  const isCheckedIn = eventType === "check-in" || eventType === "transfer";

  return {
    hasHistory,
    isCheckedIn,
    eventType,
    movementTime: m?.movement_time ?? null,
    locationId: hasHistory && isCheckedIn ? (m?.to_location_id ?? null) : null,
    locationName:
      hasHistory && isCheckedIn ? (m?.to_location?.name ?? null) : null,
    locationZoneId:
      hasHistory && isCheckedIn ? (m?.to_location_zone_id ?? null) : null,
    locationZoneName:
      hasHistory && isCheckedIn ? (m?.to_zone?.name ?? null) : null,
  };
}

async function getLatestSubmittedConditionReportId(
  supabase: SupabaseClient,
  assetId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("condition_reports")
    .select("id")
    .eq("asset_id", assetId)
    .eq("status", "submitted")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

// --- Page ---
export default async function CheckOutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getServerSupabaseClient();

  // 1) Vehicle + client + (optional) last known location record on the vehicle
  const vehicle = await getVehicleAndClient(supabase, id);
  if (!vehicle) return notFound();

  // 2) Current location derived from movements (authoritative)
  const current = await getCurrentLocation(supabase, vehicle.id);

  // 3) Latest submitted condition report (to seed/check against)
  const conditionReportId = await getLatestSubmittedConditionReportId(
    supabase,
    vehicle.id,
  );

  // 4) Derive display-friendly props for the wizard
  const clientLabel = vehicle.client
    ? [
        vehicle.client.firstName,
        vehicle.client.lastName,
        vehicle.client.companyName ? `(${vehicle.client.companyName})` : null,
      ]
        .filter(Boolean)
        .join(" ")
    : "Unknown client";

  const vehicleLabel = vehicle.identifier;
  const vehicleLocation =
    current.isCheckedIn && current.locationName
      ? current.locationName
      : "Checked out";

  return (
    <CheckOutWizardPage
      // keep prop names consistent with your wizard’s expectations
      client={clientLabel}
      vehicle={vehicleLabel}
      vehicleId={vehicle.id}
      vehicleLocation={vehicleLocation}
      currentLocation={{
        id: current.locationId,
        name: current.locationName,
        zoneId: current.locationZoneId,
        zoneName: current.locationZoneName,
      }}
      conditionReportId={conditionReportId}
      // you can also pass richer objects if your wizard accepts them
      clientContact={
        vehicle.client
          ? {
              id: vehicle.client.id,
              email: vehicle.client.email,
              phone: vehicle.client.phone,
            }
          : null
      }
      // if you need the raw vehicle meta inside the wizard:
      vehicleMeta={{
        make: vehicle.make,
        model: vehicle.model,
        colour: vehicle.colour,
        assetType: vehicle.assetType,
        vehicleType: toVehicleType(vehicle.vehicleType),
      }}
    />
  );
}
