"use client";
import { LocationDetails, MovementState, Valeting } from "@/lib/types";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import { ChevronDown } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import DatePicker from "../base/DatePicker";

import NextButton from "../base/buttons/NextButton";
import CancelButton from "../base/buttons/CancelButton";
import { useEffect, useMemo } from "react";

type MovementFormStepProps = {
  value: MovementState;
  onChange: (next: MovementState) => void;

  locationsList: LocationDetails[];
  locationsLoading: boolean;
  locationsError: Error | undefined;

  onNext: () => void;
  onBack: () => void;
};

export default function MovementFormStep({
  value,
  onChange,
  locationsList,
  locationsLoading,
  locationsError,
  onNext,
  onBack,
}: MovementFormStepProps) {
  useEffect(() => {
    const zoneStillValid = zones.some((z) => z.id === value.locationZoneId);
    if (!zoneStillValid && value.locationZoneId) {
      onChange({ ...value, locationZoneId: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.locationId, locationsList]); // zones derives from these

  const set = (patch: Partial<MovementState>) =>
    onChange({ ...value, ...patch });

  const toYMD = (d: Date | null) =>
    d
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
          d.getDate(),
        ).padStart(2, "0")}`
      : null;
  const today = useMemo(() => new Date(), []);

  // find the currently selected parent location and its zones
  const selectedLocation = useMemo(
    () => locationsList.find((l) => l.id === value.locationId) ?? null,
    [locationsList, value.locationId],
  );
  const zones = selectedLocation?.zones ?? [];
  const requireZone = zones.length > 0;

  const canContinue =
    !!value.locationId &&
    (!requireZone || !!value.locationZoneId) &&
    (!value.motRequired || !!value.motDate) &&
    (!value.serviceRequired || !!value.serviceDate);

  return (
    <div className="flex flex-col gap-5">
      {/* Location */}
      <div className="space-y-1.5">
        <Label htmlFor="location">Location</Label>
        <Select
          required
          value={value.locationId ?? ""}
          // onValueChange={(id) =>
          //   set({
          //     locationId: id,
          //     locationZoneId:
          //       id === value.locationId ? value.locationZoneId : null, // reset if changed
          //   })
          // }
          onValueChange={(id) => {
            const nextLoc = locationsList.find((l) => l.id === id);
            set({
              locationId: id,
              locationZoneId:
                nextLoc && nextLoc.zones.length ? value.locationZoneId : null,
            });
          }}
          disabled={locationsLoading || !!locationsError}
        >
          <SelectTrigger id="location" className="w-full justify-between">
            <SelectValue placeholder="Select location" />
            <ChevronDown className="h-4 w-4 text-[#2D3ECD]" />
          </SelectTrigger>
          <SelectContent>
            {locationsList.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sub-location */}
        {requireZone && (
          <div className="space-y-1.5">
            <Label htmlFor="locationZone">Sub-location</Label>
            <Select
              required
              value={value.locationZoneId ?? ""}
              onValueChange={(id) => set({ locationZoneId: id })}
              disabled={locationsLoading || !!locationsError}
            >
              <SelectTrigger
                id="locationZone"
                className="w-full justify-between"
              >
                <SelectValue placeholder="Select sub-location" />
                <ChevronDown className="h-4 w-4 text-[#2D3ECD]" />
              </SelectTrigger>
              <SelectContent>
                {zones.map((z) => (
                  <SelectItem key={z.id} value={z.id}>
                    {z.name}
                    {z.floor ? ` — ${z.floor}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {locationsError && (
          <p className="text-destructive text-sm">
            Could not load locations: {locationsError.message}
          </p>
        )}
      </div>

      {/* Tag number */}
      <div className="flex flex-col space-y-1.5">
        <Label htmlFor="tagNumber">Tag Number</Label>
        <Input
          id="tagNumber"
          type="text"
          placeholder="#1023"
          value={value.tagNumber}
          onChange={(e) => set({ tagNumber: e.target.value })}
          autoComplete="off"
        />
      </div>

      {/* Car cover */}
      <div className="space-y-1.5">
        <Label className="leading-6">Car cover</Label>
        <RadioGroup
          value={value.cover}
          onValueChange={(v) => set({ cover: v as MovementState["cover"] })}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem
              value="storage-supplied"
              id="cover-storage-supplied"
            />
            <Label htmlFor="cover-storage-supplied">Storage supplied</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem
              value="customer-supplied"
              id="cover-customer-supplied"
            />
            <Label htmlFor="cover-customer-supplied">
              Supplied by customer
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="not-required" id="cover-not-required" />
            <Label htmlFor="cover-not-required">Not required</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Trickle charger */}
      <div className="space-y-1.5">
        <Label className="leading-6">Trickle charger</Label>
        <RadioGroup
          value={value.charger}
          onValueChange={(v) => set({ charger: v as MovementState["charger"] })}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem
              value="storage-supplied"
              id="charger-storage-supplied"
            />
            <Label htmlFor="charger-storage-supplied">Storage supplied</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem
              value="customer-supplied"
              id="charger-customer-supplied"
            />
            <Label htmlFor="charger-customer-supplied">
              Supplied by customer
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="not-required" id="charger-not-required" />
            <Label htmlFor="charger-not-required">Not required</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Valeting */}
      <div className="space-y-1.5">
        <Label className="leading-6">Valeting</Label>
        <RadioGroup
          value={value.valeting}
          onValueChange={(v) => set({ valeting: v as Valeting })}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="not-requested" id="valeting-not-requested" />
            <Label htmlFor="valeting-not-requested">Not requested</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="required" id="valeting-required" />
            <Label htmlFor="valeting-required">Required</Label>
          </div>
        </RadioGroup>
      </div>

      {/* MOT */}
      <div className="space-y-1.5">
        <Label className="leading-6">MOT</Label>
        <div className="flex items-center space-x-2">
          <Switch
            id="mot-required"
            checked={value.motRequired}
            onCheckedChange={(checked) =>
              set({
                motRequired: checked,
                motDate: checked ? value.motDate : null,
              })
            }
            className="data-[state=checked]:bg-[#2D3ECD]"
          />
          <Label htmlFor="mot-required">Required</Label>
        </div>
        {value.motRequired && (
          <DatePicker
            id="mot-date"
            value={value.motDate ? new Date(value.motDate + "T00:00") : null}
            onChange={(d) => set({ motDate: toYMD(d) })}
            minDate={today}
            allowClear
            avoidCollisions={false}
            side="top"
          />
        )}
      </div>

      {/* Service */}
      <div className="space-y-1.5">
        <Label className="leading-6">Service</Label>
        <div className="flex items-center space-x-2">
          <Switch
            id="service-required"
            checked={value.serviceRequired}
            onCheckedChange={(checked) =>
              set({
                serviceRequired: checked,
                serviceDate: checked ? value.serviceDate : null,
              })
            }
            className="data-[state=checked]:bg-[#2D3ECD]"
          />
          <Label htmlFor="service-required">Required</Label>
        </div>
        {value.serviceRequired && (
          <DatePicker
            id="service-date"
            value={
              value.serviceDate ? new Date(value.serviceDate + "T00:00") : null
            }
            onChange={(d) => set({ serviceDate: toYMD(d) })}
            minDate={today}
            allowClear
            avoidCollisions={false}
            side="top"
          />
        )}
      </div>

      {/* Notes */}
      <div className="flex flex-col space-y-1.5">
        <Label htmlFor="notes" className="leading-6">
          Storage notes:
        </Label>
        <Textarea
          id="notes"
          rows={7}
          value={value.notes}
          onChange={(e) => set({ notes: e.target.value })}
        />
      </div>

      <div className="mt-4 flex gap-2">
        <CancelButton onClick={onBack} text="Back" className="flex-1" />
        <NextButton
          onClick={onNext}
          disabled={!canContinue || locationsLoading || !!locationsError}
          className="flex-1"
        />
      </div>
    </div>
  );
}
