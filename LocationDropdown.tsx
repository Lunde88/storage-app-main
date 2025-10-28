// "use client";
// import { useClerkSupabaseClient } from "@/lib/supabaseClient";
// import { useEffect, useState } from "react";
// import {
//   Select,
//   SelectTrigger,
//   SelectValue,
//   SelectContent,
//   SelectItem,
// } from "@/components/ui/select";

// type Location = { id: string; name: string };

// type LocationDropdownProps = {
//   orgId: string;
//   value: string | null;
//   onSelect: (locationId: string) => void;
//   disabled?: boolean;
//   /** Current location of the asset — will be disabled/hidden in the list */
//   currentLocationId?: string | null;
//   /** If true, remove the current location from the list entirely (instead of disabling) */
//   excludeCurrent?: boolean;
// };

// export default function LocationDropdown({
//   orgId,
//   onSelect,
//   value,
//   disabled,
//   currentLocationId,
//   excludeCurrent = false,
// }: LocationDropdownProps) {
//   const supabase = useClerkSupabaseClient();
//   const [locations, setLocations] = useState<Location[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     let isMounted = true;
//     (async () => {
//       setLoading(true);
//       const { data, error } = await supabase
//         .from("locations")
//         .select("id, name")
//         .is("deleted_at", null)
//         .eq("clerk_organisation_id", orgId)
//         .order("name");
//       if (!error && isMounted) setLocations(data || []);
//       setLoading(false);
//     })();
//     return () => {
//       isMounted = false;
//     };
//   }, [orgId, supabase]);

//   // Optionally remove the current location
//   const options = excludeCurrent
//     ? locations.filter((l) => l.id !== currentLocationId)
//     : locations;

//   return (
//     <div className="my-4">
//       <label className="text-foreground mb-1 block text-sm font-medium">
//         Select location
//       </label>

//       {loading ? (
//         <div className="text-muted-foreground text-sm">Loading locations…</div>
//       ) : (
//         <Select
//           value={value ?? ""}
//           onValueChange={(v) => {
//             // guard: don’t allow selecting current location even if not excluded
//             if (v === currentLocationId) return;
//             onSelect(v);
//           }}
//           disabled={disabled}
//         >
//           <SelectTrigger className="w-full">
//             <SelectValue placeholder="Choose a destination" />
//           </SelectTrigger>
//           <SelectContent>
//             {options.map((loc) => {
//               const isCurrent = loc.id === currentLocationId && !excludeCurrent;
//               return (
//                 <SelectItem
//                   key={loc.id}
//                   value={loc.id}
//                   disabled={isCurrent} // <- this greys it out & blocks selection
//                 >
//                   {loc.name}
//                   {isCurrent && (
//                     <span className="text-muted-foreground ml-2 text-xs">
//                       (current)
//                     </span>
//                   )}
//                 </SelectItem>
//               );
//             })}
//           </SelectContent>
//         </Select>
//       )}
//     </div>
//   );
// }

"use client";
import { useClerkSupabaseClient } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type Zone = { id: string; name: string };
type Location = { id: string; name: string; zones: Zone[] };

export type DestinationSelection = {
  locationId: string | null;
  locationName?: string | null;
  zoneId?: string | null; // null means “must choose”; undefined means “no zones for this location”
  zoneName?: string | null;
  requiresZone?: boolean; // true when the chosen location has zones
};

type LocationDropdownProps = {
  orgId: string;
  value: DestinationSelection;
  onSelect: (sel: DestinationSelection) => void;
  disabled?: boolean;
  currentLocationId?: string | null;
  currentZoneId?: string | null;
  excludeCurrent?: boolean;
  allowSelectCurrent?: boolean;
};

export default function LocationDropdown({
  orgId,
  onSelect,
  value,
  disabled,
  currentLocationId,
  currentZoneId,
  excludeCurrent = false,
  allowSelectCurrent = false,
}: LocationDropdownProps) {
  const supabase = useClerkSupabaseClient();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("locations")
        .select(
          `
          id, name,
          location_zones (
            id, name, sort_order
          )
        `,
        )
        .is("deleted_at", null)
        .eq("clerk_organisation_id", orgId)
        .order("name", { ascending: true })
        .order("sort_order", {
          foreignTable: "location_zones",
          ascending: true,
        });

      if (!error && isMounted) {
        const mapped: Location[] =
          (data ?? []).map((l) => ({
            id: l.id,
            name: l.name,
            zones: (l.location_zones ?? []).map((z) => ({
              id: z.id,
              name: z.name,
            })),
          })) ?? [];
        setLocations(mapped);
      }
      setLoading(false);
    })();
    return () => {
      isMounted = false;
    };
  }, [orgId, supabase]);

  // Filter/disable current location if required
  const options = useMemo(() => {
    return excludeCurrent
      ? locations.filter((l) => l.id !== currentLocationId)
      : locations; // <-- this colon is the important bit
  }, [locations, excludeCurrent, currentLocationId]);

  const selectedLocation = useMemo(
    () => options.find((l) => l.id === value.locationId) ?? null,
    [options, value.locationId],
  );

  const zones = selectedLocation?.zones ?? [];
  const requiresZone = zones.length > 0;

  const handleLocationChange = (locationId: string) => {
    const loc = options.find((l) => l.id === locationId) ?? null;
    if (!loc) return;

    const needsZone = (loc.zones?.length ?? 0) > 0; // ← compute from new loc
    onSelect({
      locationId: loc.id,
      locationName: loc.name,
      zoneId: needsZone ? null : undefined, // null = must choose; undefined = no zones
      zoneName: null,
      requiresZone: needsZone,
    });
  };

  const handleZoneChange = (zoneId: string) => {
    if (!selectedLocation) return;
    const z = zones.find((zz) => zz.id === zoneId) ?? null;
    onSelect({
      locationId: selectedLocation.id,
      locationName: selectedLocation.name,
      zoneId: z?.id ?? null,
      zoneName: z?.name ?? null,
      requiresZone: true,
    });
  };

  return (
    <div className="my-4 space-y-3">
      <div>
        <Label className="text-foreground mb-1 block text-sm font-medium">
          Select location
        </Label>

        {loading ? (
          <div className="text-muted-foreground text-sm">
            Loading locations…
          </div>
        ) : (
          <Select
            value={value.locationId ?? ""}
            onValueChange={(v) => {
              if (!allowSelectCurrent && v === currentLocationId) return;
              handleLocationChange(v);
            }}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a destination" />
            </SelectTrigger>
            <SelectContent>
              {options.map((loc) => {
                const isCurrentLoc = loc.id === currentLocationId;
                const isDisabled =
                  !allowSelectCurrent && isCurrentLoc && !excludeCurrent;
                return (
                  <SelectItem key={loc.id} value={loc.id} disabled={isDisabled}>
                    {loc.name}
                    {isCurrentLoc && (
                      <span className="text-muted-foreground ml-2 text-xs">
                        (current)
                      </span>
                    )}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Sub-location select appears only when the chosen location has zones */}
      {selectedLocation && requiresZone && (
        <div>
          <Label className="text-foreground mb-1 block text-sm font-medium">
            Sub-location
          </Label>
          <Select
            value={value.zoneId ?? ""}
            onValueChange={handleZoneChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select sub-location" />
            </SelectTrigger>
            <SelectContent>
              {zones.map((z) => {
                // Disable exact no-op: same location AND same zone
                const isCurrentChoice =
                  selectedLocation.id === currentLocationId &&
                  z.id === (currentZoneId ?? null);

                return (
                  <SelectItem
                    key={z.id}
                    value={z.id}
                    disabled={isCurrentChoice}
                  >
                    {z.name}
                    {isCurrentChoice && (
                      <span className="text-muted-foreground ml-2 text-xs">
                        (current)
                      </span>
                    )}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {value.zoneId === null && (
            <p className="mt-2 text-xs text-amber-600">
              This location has sub-locations. Please select one.
            </p>
          )}
        </div>
      )}

      {/* Optional helper text when the location has no zones */}
      {selectedLocation && !requiresZone && (
        <p className="text-muted-foreground text-xs">
          This location has no sub-locations.
        </p>
      )}
    </div>
  );
}
