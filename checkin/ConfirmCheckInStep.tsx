"use client";

import {
  VEHICLE_LEVELS,
  VehicleLevelType,
  ConditionReportDraft,
  ClientInput,
  AssetInput,
  MovementState,
} from "@/lib/types/index";

import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import CancelButton from "../base/buttons/CancelButton";
import NextButton from "../base/buttons/NextButton";

type ConfirmCheckInProps = {
  client: ClientInput | null;
  vehicle: AssetInput | null;
  condition: ConditionReportDraft | null;
  movement?: MovementState & { locationName?: string };
  isLoading?: boolean;
  error?: string | null;
  onBack: () => void;
  onSubmit: () => Promise<void>;
};

function formatName(client: ClientInput | null) {
  if (!client) return displayOrNotRecorded(undefined);
  const name = [client.firstName, client.lastName].filter(Boolean).join(" ");
  return displayOrNotRecorded(name);
}

function formatAddress(client: ClientInput | null): React.ReactNode {
  if (!client) return displayOrNotRecorded(undefined);
  const parts = [
    client.addressLine1,
    client.addressLine2,
    client.city,
    client.postcode,
    client.country,
  ].filter(Boolean);

  if (parts.length === 0) return displayOrNotRecorded(undefined);
  return (
    <>
      {parts.map((part, i) => (
        <span key={i} className="block">
          {part}
        </span>
      ))}
    </>
  );
}

function displayOrNotRecorded(value: string | undefined | null | number) {
  if (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return (
      <span className="text-muted-foreground text-xs italic">Not recorded</span>
    );
  }
  return value;
}

function formatDateUK(iso?: string | null) {
  if (!iso) return displayOrNotRecorded(undefined);
  const d = new Date(iso);
  if (isNaN(d.getTime())) return displayOrNotRecorded(undefined);
  // DD/MM/YYYY
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function labelFromCover(v?: string) {
  switch (v) {
    case "storage-supplied":
      return "Storage supplied";
    case "customer-supplied":
      return "Supplied by customer";
    case "not-required":
      return "Not required";
    default:
      return undefined;
  }
}

function labelFromCharger(v?: string) {
  switch (v) {
    case "storage-supplied":
      return "Storage supplied";
    case "customer-supplied":
      return "Supplied by customer";
    case "not-required":
      return "Not required";
    default:
      return undefined;
  }
}

function labelFromValeting(v?: string) {
  switch (v) {
    case "required":
      return "Required";
    case "not-requested":
      return "Not requested";
    default:
      return undefined;
  }
}

export default function ConfirmCheckInStep({
  client,
  vehicle,
  condition,
  movement,
  error,
  isLoading,
  onBack,
  onSubmit,
}: ConfirmCheckInProps) {
  const handleConfirmClick = async () => {
    await onSubmit(); // This is the async parent function (e.g., handleFinalSubmit)
  };

  // Use the vehicle type to filter levels shown, if available
  const activeLevels = vehicle?.vehicleType
    ? VEHICLE_LEVELS.filter((level) => level.for.includes(vehicle.vehicleType!))
    : VEHICLE_LEVELS;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Client */}

      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold">Client</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <Label className="text-muted-foreground mb-1 block text-xs tracking-wider uppercase">
                Name
              </Label>
              <div>{formatName(client)}</div>
            </div>
            <div>
              <Label className="text-muted-foreground mb-1 block text-xs tracking-wider uppercase">
                Company
              </Label>
              <div>{displayOrNotRecorded(client?.companyName)}</div>
            </div>
            <div>
              <Label className="text-muted-foreground mb-1 block text-xs tracking-wider uppercase">
                Email
              </Label>
              <div>{displayOrNotRecorded(client?.email)}</div>
            </div>
            <div>
              <Label className="text-muted-foreground mb-1 block text-xs tracking-wider uppercase">
                Phone
              </Label>
              <div>{displayOrNotRecorded(client?.phone)}</div>
            </div>
            <div>
              <Label className="text-muted-foreground mb-1 block text-xs tracking-wider uppercase">
                Address
              </Label>
              <div>{formatAddress(client)}</div>
            </div>
            <div>
              <Label className="text-muted-foreground mb-1 block text-xs tracking-wider uppercase">
                Notes
              </Label>
              <div className="text-xs">
                {displayOrNotRecorded(client?.notes)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle */}
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold">Vehicle</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <Label className="text-muted-foreground mb-1 block text-xs tracking-wider uppercase">
                Identifier
              </Label>
              <div className="uppercase">
                {displayOrNotRecorded(vehicle?.identifier)}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground mb-1 block text-xs tracking-wider uppercase">
                Vehicle Type
              </Label>
              <div className="capitalize">
                {displayOrNotRecorded(vehicle?.assetType)}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground mb-1 block text-xs tracking-wider uppercase">
                Fuel/Drive Type
              </Label>
              <div className="capitalize">
                {displayOrNotRecorded(vehicle?.vehicleType)}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground mb-1 block text-xs tracking-wider uppercase">
                Details
              </Label>
              <div>
                {[vehicle?.make, vehicle?.model, vehicle?.colour].filter(
                  Boolean,
                ).length > 0 ? (
                  [vehicle?.make, vehicle?.model, vehicle?.colour]
                    .filter(Boolean)
                    .join(" ")
                ) : (
                  <span className="text-muted-foreground italic">
                    Not recorded
                  </span>
                )}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground mb-1 block text-xs tracking-wider uppercase">
                Year
              </Label>
              <div>{displayOrNotRecorded(vehicle?.year)}</div>
            </div>
            <div>
              <Label className="text-muted-foreground mb-1 block text-xs tracking-wider uppercase">
                Notes
              </Label>
              <div className="text-xs">
                {displayOrNotRecorded(vehicle?.notes)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Condition Report */}
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold">Condition Report</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <Label className="text-muted-foreground mb-1 block text-xs tracking-wider uppercase">
                Odometer
              </Label>
              <div>{displayOrNotRecorded(condition?.odometer)}</div>
            </div>

            <div>
              <Label className="text-muted-foreground mb-1 block text-xs tracking-wider uppercase">
                Notes
              </Label>
              <div className="text-xs">
                {displayOrNotRecorded(condition?.notes)}
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Vehicle Levels */}
          <div>
            <Label className="mb-2 block font-semibold">Vehicle Levels</Label>
            <div className="space-y-2">
              {activeLevels.map((level) => {
                const v =
                  condition?.vehicleLevels?.[level.key as VehicleLevelType];
                return (
                  <div key={level.key} className="flex items-center gap-2">
                    <span className="w-40">{level.label}</span>
                    {v === null || v === undefined ? (
                      <span className="text-muted-foreground text-xs italic">
                        Not recorded
                      </span>
                    ) : (
                      <span className="font-mono">{Math.round(v * 100)}%</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storage Details */}
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold">Storage Details</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <Label className="text-muted-foreground mb-1 block text-xs tracking-wider uppercase">
                Tag Number
              </Label>
              <div>{displayOrNotRecorded(movement?.tagNumber)}</div>
            </div>

            <div>
              <Label className="text-muted-foreground mb-1 block text-xs tracking-wider uppercase">
                Car Cover
              </Label>
              <div>{displayOrNotRecorded(labelFromCover(movement?.cover))}</div>
            </div>

            <div>
              <Label className="text-muted-foreground mb-1 block text-xs tracking-wider uppercase">
                Trickle Charger
              </Label>
              <div>
                {displayOrNotRecorded(labelFromCharger(movement?.charger))}
              </div>
            </div>

            <div>
              <Label className="text-muted-foreground mb-1 block text-xs tracking-wider uppercase">
                Valeting
              </Label>
              <div>
                {displayOrNotRecorded(labelFromValeting(movement?.valeting))}
              </div>
            </div>

            <Separator className="my-2" />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label className="text-muted-foreground mb-1 block text-xs tracking-wider uppercase">
                  MOT Required
                </Label>
                <div>{movement?.motRequired ? "Yes" : "No"}</div>
              </div>
              <div>
                <Label className="text-muted-foreground mb-1 block text-xs tracking-wider uppercase">
                  MOT Date
                </Label>
                <div>
                  {movement?.motRequired
                    ? formatDateUK(movement?.motDate)
                    : displayOrNotRecorded(undefined)}
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground mb-1 block text-xs tracking-wider uppercase">
                  Service Required
                </Label>
                <div>{movement?.serviceRequired ? "Yes" : "No"}</div>
              </div>
              <div>
                <Label className="text-muted-foreground mb-1 block text-xs tracking-wider uppercase">
                  Service Date
                </Label>
                <div>
                  {movement?.serviceRequired
                    ? formatDateUK(movement?.serviceDate)
                    : displayOrNotRecorded(undefined)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Movement (Location & Notes) */}
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold">Location &amp; Notes</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <Label className="text-muted-foreground mb-1 block text-xs tracking-wider uppercase">
                Location
              </Label>
              <div>
                {displayOrNotRecorded(
                  movement?.locationName || movement?.locationId || undefined,
                )}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground mb-1 block text-xs tracking-wider uppercase">
                Movement Notes
              </Label>
              <div className="text-xs">
                {displayOrNotRecorded(movement?.notes)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error message */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {/* Controls */}

      <div className="mt-4 flex gap-2">
        <CancelButton onClick={onBack} text="Back" className="flex-1" />
        <NextButton
          onClick={handleConfirmClick}
          isLoading={isLoading}
          text={isLoading ? "Submitting…" : "Confirm & Check In"}
          className="flex-1"
        />
      </div>
    </div>
  );
}
