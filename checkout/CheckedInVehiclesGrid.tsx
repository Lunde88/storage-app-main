"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MapPin, CircleUserRound, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type CheckedInVehicle = {
  id: string;
  clientId: string | null;
  clientLabel: string | null;
  identifier: string;
  make: string | null;
  model: string | null;
  colour: string | null;
  year: number | null;
  assetType: string | null;
  vehicleType: string | null;
  vinNumber: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  isCheckedIn: boolean;
  lastEventType: "check-in" | "check-out" | "transfer" | null;
  lastMovementTime: string | null;
  lastLocationId: string | null;
  lastLocationName: string | null;
  lastLocationZoneId: string | null;
  lastLocationZoneName: string | null;
};

export type LocationOption = {
  id: string;
  name: string;
};

type TimeFilter = "all" | "24h" | "7d";

const TIME_FILTER_OPTIONS: { value: TimeFilter; label: string }[] = [
  { value: "all", label: "Any time" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
];

type CheckedInVehiclesGridProps = {
  vehicles: CheckedInVehicle[];
  locations: LocationOption[];
};

export default function CheckedInVehiclesGrid({
  vehicles,
  locations,
}: CheckedInVehiclesGridProps) {
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");

  const locationsById = useMemo(() => {
    return new Map(locations.map((loc) => [loc.id, loc.name]));
  }, [locations]);

  const locationOptions = useMemo(() => {
    const unique = new Map<string, string>();
    for (const vehicle of vehicles) {
      if (vehicle.lastLocationId) {
        const label =
          vehicle.lastLocationName ??
          locationsById.get(vehicle.lastLocationId) ??
          "Unknown location";
        unique.set(vehicle.lastLocationId, label);
      }
    }

    const opts: { value: string; label: string }[] = [
      { value: "all", label: "All locations" },
    ];

    if (unique.size > 0) {
      for (const [id, label] of Array.from(unique.entries()).sort((a, b) =>
        a[1].localeCompare(b[1]),
      )) {
        opts.push({ value: id, label });
      }
    }

    const hasUnassigned = vehicles.some((v) => !v.lastLocationId);
    if (hasUnassigned) {
      opts.push({ value: "none", label: "No location recorded" });
    }

    return opts;
  }, [vehicles, locationsById]);

  const filteredVehicles = useMemo(() => {
    const now = Date.now();

    return vehicles
      .filter((vehicle) => {
        if (locationFilter === "all") return true;
        if (locationFilter === "none") return !vehicle.lastLocationId;
        return vehicle.lastLocationId === locationFilter;
      })
      .filter((vehicle) => {
        if (timeFilter === "all") return true;
        if (!vehicle.lastMovementTime) return false;

        const movementTime = new Date(vehicle.lastMovementTime).getTime();
        if (Number.isNaN(movementTime)) return false;

        const diff = now - movementTime;
        if (timeFilter === "24h") {
          return diff <= 24 * 60 * 60 * 1000;
        }
        if (timeFilter === "7d") {
          return diff <= 7 * 24 * 60 * 60 * 1000;
        }
        return true;
      })
      .slice()
      .sort((a, b) => {
        const aTime = a.lastMovementTime
          ? new Date(a.lastMovementTime).getTime()
          : 0;
        const bTime = b.lastMovementTime
          ? new Date(b.lastMovementTime).getTime()
          : 0;
        return bTime - aTime;
      });
  }, [vehicles, locationFilter, timeFilter]);

  const selectedLocationLabel = useMemo(() => {
    const option = locationOptions.find((opt) => opt.value === locationFilter);
    return option?.label ?? "All locations";
  }, [locationOptions, locationFilter]);

  const selectedTimeLabel = useMemo(() => {
    return (
      TIME_FILTER_OPTIONS.find((opt) => opt.value === timeFilter)?.label ??
      "Any time"
    );
  }, [timeFilter]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Checked-in vehicles
          </h2>
          <p className="text-muted-foreground text-sm">
            Showing {filteredVehicles.length} of {vehicles.length} currently checked-in vehicles.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Location" aria-label={selectedLocationLabel}>
                {selectedLocationLabel}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {locationOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeFilter} onValueChange={(value) => setTimeFilter(value as TimeFilter)}>
            <SelectTrigger>
              <SelectValue placeholder="Movement" aria-label={selectedTimeLabel}>
                {selectedTimeLabel}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {TIME_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredVehicles.length === 0 ? (
        <div className="text-muted-foreground rounded-2xl border border-dashed border-black/10 bg-white p-10 text-center">
          <p className="text-base font-medium">No vehicles match your filters.</p>
          <p className="mt-1 text-sm">
            Try selecting a different location or widening the movement time window.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
          {filteredVehicles.map((vehicle) => {
            const label = vehicle.identifier
              ? vehicle.identifier.toUpperCase()
              : "Unassigned";
            const clientLabel = vehicle.clientLabel ?? "Unassigned client";
            const locationLabel = vehicle.lastLocationName ?? "Unknown location";
            const zoneLabel = vehicle.lastLocationZoneName;
            const lastMoved = vehicle.lastMovementTime
              ? formatDistanceToNow(new Date(vehicle.lastMovementTime), {
                  addSuffix: true,
                })
              : "No movement recorded";

            return (
              <article
                key={vehicle.id}
                className="flex h-full flex-col justify-between rounded-xl border border-black/5 bg-[#FAFAFA] p-4 transition-colors hover:bg-[#F5F5F5]"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <span className="font-heading inline-block rounded-sm border border-[#5C5757] bg-[#FFFDE1] px-2 py-1 text-sm font-semibold">
                        {label}
                      </span>
                      <div className="space-y-1 text-sm">
                        <p className="text-base font-medium">
                          {[vehicle.make, vehicle.model]
                            .filter(Boolean)
                            .join(" ") || "Vehicle"}
                        </p>
                        {(vehicle.year || vehicle.colour) && (
                          <p className="text-muted-foreground text-xs">
                            {[vehicle.year, vehicle.colour]
                              .filter(Boolean)
                              .join(" • ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button asChild size="sm" className="whitespace-nowrap">
                      <Link href={`/vehicle/${vehicle.id}/check-out`}>
                        Check out
                      </Link>
                    </Button>
                  </div>

                  <dl className="space-y-2 text-sm text-slate-700">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-500" />
                      <div>
                        <dt className="sr-only">Location</dt>
                        <dd>
                          {locationLabel}
                          {zoneLabel ? <span className="text-muted-foreground"> — {zoneLabel}</span> : null}
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CircleUserRound className="h-4 w-4 text-slate-500" />
                      <div>
                        <dt className="sr-only">Client</dt>
                        <dd>{clientLabel}</dd>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-500" />
                      <div>
                        <dt className="sr-only">Last movement</dt>
                        <dd>{lastMoved}</dd>
                      </div>
                    </div>
                  </dl>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
