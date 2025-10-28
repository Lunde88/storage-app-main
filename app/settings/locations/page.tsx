// app/settings/locations/page.tsx
import LocationsManager from "@/components/settings/LocationsManager";
import { listLocationsWithZones } from "@/lib/actions/locationActions";

export const dynamic = "force-dynamic"; // ensure fresh fetch

export default async function LocationsSettingsPage() {
  const locations = await listLocationsWithZones();
  return (
    <div className="mx-auto max-w-4xl p-4">
      <h1 className="mb-4 text-2xl font-semibold">Locations & Sub-locations</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Add, edit and organise storage locations for your organisation.
        Sub-locations (like “Shed 1 — Ground floor”) are optional.
      </p>
      <LocationsManager initialData={locations} />
    </div>
  );
}
