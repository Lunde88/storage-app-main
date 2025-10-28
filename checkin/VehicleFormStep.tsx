// Vehicle details form
"use client";
import { useState, useEffect, useRef } from "react";

import { Textarea } from "@/components/ui/textarea";
import {
  AssetType,
  ASSET_TYPES,
  VehicleType,
  VEHICLE_TYPES,
  AssetWithStatus,
} from "@/lib/types/index";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { FormField } from "../forms/FormField";
import { VehicleCombobox } from "../forms/VehicleCombobox";
import { Alert, AlertDescription } from "../ui/alert";
import { FormInput } from "../base/form/FormInput";
import { FormSelect } from "../base/form/FormSelect";
import { VehicleRegLookupFields } from "../vehicle/VehicleRegLookupFields";

import { insertVehicle } from "@/lib/actions/vehicleActions";
import { mutate } from "swr";
import CancelButton from "../base/buttons/CancelButton";
import NextButton from "../base/buttons/NextButton";
import { AssetInsertInput } from "@/lib/cleanseForDB";

type VehicleFormProps = {
  value: AssetWithStatus | null;
  onChange: (vehicle: AssetWithStatus | null) => void;
  onNext: () => void;
  onBack: () => void;
  vehiclesList: AssetWithStatus[];
  vehiclesLoading: boolean;
  vehiclesError: Error | undefined;
  addNewVehicle: boolean;
  setAddNewVehicle: (value: boolean) => void;
  clientId: string | null;
};

export default function VehicleFormStep({
  value,
  onChange,
  onNext,
  onBack,
  vehiclesList,
  vehiclesLoading,
  vehiclesError,
  addNewVehicle,
  setAddNewVehicle,
  clientId,
}: VehicleFormProps) {
  // Required
  const [identifier, setIdentifier] = useState(value?.identifier || "");
  const [vinNumber, setVinNumber] = useState(value?.vinNumber || "");
  const [assetType, setAssetType] = useState<AssetType | "">(
    value?.assetType || "",
  );

  // Optional
  const [make, setMake] = useState(value?.make || "");
  const [model, setModel] = useState(value?.model || "");
  const [colour, setColour] = useState(value?.colour || "");
  const [year, setYear] = useState(value?.year ? String(value.year) : "");
  const [vehicleType, setVehicleType] = useState<VehicleType | "">(
    value?.vehicleType || "",
  );
  const [notes, setNotes] = useState(value?.notes || "");

  const isExistingAsset = !!(value?.id && !value.id.startsWith("temp-"));
  const vehicleAlreadyCheckedIn = !!value?.isCheckedIn;

  const [formError, setFormError] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);

  const [submitting, setSubmitting] = useState(false);

  const requiredFieldsFilled =
    identifier.trim() !== "" &&
    assetType !== "" &&
    vehicleType !== "" &&
    make.trim() !== "" &&
    model.trim() !== "" &&
    colour.trim() !== "";

  const canProceed =
    !vehicleAlreadyCheckedIn &&
    (addNewVehicle ? requiredFieldsFilled : !!(value && value.id)) &&
    !submitting;

  useEffect(() => {
    if (value) {
      setIdentifier(value.identifier || "");
      setVinNumber(value.vinNumber || "");
      setAssetType(value.assetType || "");
      setMake(value.make || "");
      setModel(value.model || "");
      setColour(value.colour || "");
      setVehicleType(value.vehicleType || "");
      setYear(value.year ? String(value.year) : "");
      setNotes(value.notes || "");
    } else {
      // Reset all fields if value is null
      setIdentifier("");
      setVinNumber("");
      setAssetType("");
      setMake("");
      setModel("");
      setColour("");
      setVehicleType("");
      setYear("");
      setNotes("");
    }
  }, [value]);

  const handleSelectVehicle = (vehicle: AssetWithStatus | null) => {
    setFormError("");
    if (vehicle) {
      onChange(vehicle);
      setAddNewVehicle(false);
    } else {
      onChange(null);
      setAddNewVehicle(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Existing vehicle selected, just go ahead
    if (isExistingAsset) {
      setFormError("");
      onNext();
      return;
    }

    // New vehicle path
    if (!addNewVehicle) {
      setFormError("Please select a vehicle or choose 'Add new'.");
      return;
    }

    if (!clientId) {
      setFormError("No client selected. Please choose a client first.");
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (!requiredFieldsFilled) {
      setFormError("Please fill in all required vehicle details.");
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setFormError("");
    setSubmitting(true);

    // Build the payload the server action expects (camelCase; action maps to snake_case)
    const payload: AssetInsertInput = {
      clientId: clientId!,
      identifier,
      vinNumber: vinNumber || undefined,
      assetType: assetType as AssetType,
      vehicleType: vehicleType as VehicleType,
      make: make || undefined,
      model: model || undefined,
      colour: colour || undefined,
      year: year ? Number(year) : undefined,
      notes: notes || undefined,
    };

    try {
      // Persist immediately – returns real asset with id
      const created = await insertVehicle(payload);

      // onChange({
      //   ...created,
      //   isCheckedIn: false,
      //   lastEventType: null,
      //   lastMovementTime: null,
      // });

      onChange({
        ...created,
      });

      // Revalidate SWR list for this client
      if (clientId) {
        mutate(`vehicles:${clientId}`);
      }

      setAddNewVehicle(false);
      onNext();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to create vehicle.";
      setFormError(msg);
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {vehicleAlreadyCheckedIn && (
        <Alert variant="destructive" className="mb-3">
          <AlertDescription>
            This vehicle is already checked in. <br />
            Please select another vehicle or add a new one.
          </AlertDescription>
        </Alert>
      )}
      {formError && (
        <Alert
          variant="destructive"
          className="scroll-margin-top mb-3"
          ref={errorRef}
          tabIndex={-1}
        >
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      {!addNewVehicle && (
        <VehicleCombobox
          vehiclesList={vehiclesList}
          value={value}
          onChange={handleSelectVehicle}
          loading={vehiclesLoading}
          error={vehiclesError}
        />
      )}
      {addNewVehicle && (
        <>
          <VehicleRegLookupFields
            identifier={identifier}
            setIdentifier={setIdentifier}
            make={make}
            setMake={setMake}
            model={model}
            setModel={setModel}
            colour={colour}
            setColour={setColour}
            year={year}
            setYear={setYear}
          />

          <FormField label="VIN Number (optional)" htmlFor="vin-number">
            <FormInput
              id="vin-number"
              name="vinNumber"
              placeholder="Enter VIN number"
              value={vinNumber}
              onChange={(e) => setVinNumber(e.target.value)}
              autoComplete="off"
              disabled={isExistingAsset || submitting}
            />
          </FormField>

          <FormField label="Vehicle type" htmlFor="asset-type" required>
            <FormSelect
              id="asset-type"
              label="Vehicle type"
              value={assetType}
              onValueChange={(val) => setAssetType(val as AssetType)}
              options={ASSET_TYPES.map((t) => ({
                value: t,
                label: t.charAt(0).toUpperCase() + t.slice(1),
              }))}
              selectLabel="Type"
              required
              disabled={isExistingAsset || submitting}
              placeholder="Select vehicle type…"
            />
          </FormField>

          <FormField
            label="Fuel/drive type"
            htmlFor="vehicle-type-select"
            required
          >
            <Select
              value={vehicleType}
              onValueChange={(val) => setVehicleType(val as VehicleType)}
              required
              disabled={isExistingAsset || submitting}
            >
              <SelectTrigger id="vehicle-type-select" className="w-full">
                <SelectValue placeholder="Select fuel or drive type…" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Type</SelectLabel>
                  {VEHICLE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Manufacturer" htmlFor="make" required>
            <FormInput
              id="make"
              name="make"
              placeholder="Enter manufacturer name"
              value={make}
              onChange={(e) => setMake(e.target.value)}
              autoComplete="off"
              disabled={isExistingAsset || submitting}
            />
          </FormField>

          <FormField label="Model" htmlFor="model" required>
            <FormInput
              id="model"
              name="model"
              placeholder="Enter model name"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              autoComplete="off"
              disabled={isExistingAsset || submitting}
            />
          </FormField>

          <FormField label="Colour" htmlFor="colour" required>
            <FormInput
              id="colour"
              name="colour"
              placeholder="Enter colour"
              value={colour}
              onChange={(e) => setColour(e.target.value)}
              autoComplete="off"
              disabled={isExistingAsset || submitting}
            />
          </FormField>

          {/* <FormField label="Year" htmlFor="year">
            <FormInput
              id="year"
              name="year"
              type="number"
              placeholder="Enter year of manufacture"
              value={year}
              min="1900"
              max={new Date().getFullYear()}
              onChange={(e) => setYear(e.target.value)}
              autoComplete="off"
              disabled={isExistingAsset || submitting}
            />
          </FormField> */}

          <FormField label="Notes" htmlFor="notes">
            <Textarea
              id="notes"
              name="notes"
              className="!text-base"
              placeholder="Any special requirements…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isExistingAsset || submitting}
            />
          </FormField>
        </>
      )}

      {/* <div className="mt-2 flex gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          type="submit"
          size="lg"
          className="flex-1"
          // disabled={vehicleAlreadyCheckedIn}
          disabled={!canProceed}
        >
          Next: Condition
        </Button>
      </div> */}

      <div className="mt-4 flex gap-2">
        <CancelButton onClick={onBack} text="Back" className="flex-1" />
        <NextButton
          disabled={!canProceed || submitting}
          className="flex-1"
          type="submit"
        />
      </div>
    </form>
  );
}
