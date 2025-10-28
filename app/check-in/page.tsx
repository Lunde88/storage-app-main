"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import useSWR, { mutate } from "swr";
import { useAuth } from "@clerk/nextjs";
import { SupabaseClient } from "@supabase/supabase-js";

// import ClientFormStep from "@/components/checkin/ClientStep";
// import VehicleFormStep from "@/components/checkin/VehicleFormStep";
// import ConditionFormStep from "@/components/checkin/ConditionStep";
// import MovementFormStep from "@/components/checkin/MovementFormStep";
// import ConfirmCheckInStep from "@/components/checkin/ConfirmCheckInStep";
// import SuccessMessage from "@/components/forms/SuccessMessage";

import {
  Client,
  ConditionReportDraft,
  LocationDetails,
  AssetWithStatus,
  MovementState,
} from "@/lib/types/index";

import { useClerkSupabaseClient } from "@/lib/supabaseClient";
import { keysToCamelCase } from "@/utils/case";

import { submitReport } from "@/lib/actions/conditionReportActions";
import { checkInVehicle } from "@/lib/actions/movementActions";

import MainCard from "@/components/base/card/MainCard";
import MainCardHeader from "@/components/base/card/MainCardHeader";
import { CircleX, Plus, UserRoundPlus } from "lucide-react";
import IconButton from "@/components/base/buttons/IconButton";
import MainCardContent from "@/components/base/card/MainCardContent";

const ClientFormStep = dynamic(
  () => import("@/components/checkin/ClientStep"),
  {
    ssr: false,
    loading: () => (
      <div className="text-muted-foreground text-sm">Loading client…</div>
    ),
  },
);
const VehicleFormStep = dynamic(
  () => import("@/components/checkin/VehicleFormStep"),
  {
    ssr: false,
    loading: () => (
      <div className="text-muted-foreground text-sm">Loading vehicle…</div>
    ),
  },
);
const ConditionFormStep = dynamic(
  () => import("@/components/checkin/ConditionStep"),
  {
    ssr: false,
    loading: () => (
      <div className="text-muted-foreground text-sm">Loading condition…</div>
    ),
  },
);
const MovementFormStep = dynamic(
  () => import("@/components/checkin/MovementFormStep"),
  {
    ssr: false,
    loading: () => (
      <div className="text-muted-foreground text-sm">Loading storage…</div>
    ),
  },
);
const ConfirmCheckInStep = dynamic(
  () => import("@/components/checkin/ConfirmCheckInStep"),
  {
    ssr: false,
    loading: () => (
      <div className="text-muted-foreground text-sm">Loading confirmation…</div>
    ),
  },
);
const SuccessMessage = dynamic(
  () => import("@/components/forms/SuccessMessage"),
  {
    ssr: false,
  },
);

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

// Fetch clients from Supabase
const fetchClients = async (supabase: SupabaseClient) => {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .is("deleted_at", null);
  if (error) throw error;
  return keysToCamelCase(data ?? []) as Client[];
};

// Fetch client vehicles from Supabase
async function fetchVehiclesForClient(
  supabase: SupabaseClient,
  clientId: string,
): Promise<AssetWithStatus[]> {
  if (!clientId) return [];
  const { data, error } = await supabase
    .from("assets_with_latest_event")
    .select(
      `
      id,
      clientId:client_id,
      identifier, make, model, colour, year, assetType:asset_type, vehicleType:vehicle_type,
      vinNumber:vin_number, notes, createdAt:created_at, updatedAt:updated_at,
      isCheckedIn:is_checked_in,
      lastEventType:last_event_type,
      lastMovementTime:last_movement_time
    `,
    )
    .eq("client_id", clientId)
    .order("last_movement_time", { ascending: false });

  if (error) throw error;
  return (data ?? []) as AssetWithStatus[];
}

// Fetch locations from Supabase
// const fetchLocations = async (supabase: SupabaseClient) => {
//   const { data, error } = await supabase
//     .from("locations")
//     .select("*")
//     .is("deleted_at", null);
//   if (error) throw error;
//   return keysToCamelCase(data ?? []) as LocationDetails[];
// };
const fetchLocations = async (supabase: SupabaseClient) => {
  const { data, error } = await supabase
    .from("locations")
    .select(
      `
      id,
      name,
      deleted_at,
      location_zones:location_zones!location_zones_location_fk (
        id,
        location_id,
        name,
        label,
        floor,
        sort_order
      )
    `,
    )
    .is("deleted_at", null)
    .order("name", { ascending: true })
    .order("sort_order", { foreignTable: "location_zones", ascending: true });

  if (error) throw error;

  return (data ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    zones: (l.location_zones ?? []).map((z) => ({
      id: z.id,
      locationId: z.location_id,
      name: z.name,
      label: z.label,
      floor: z.floor,
      sortOrder: z.sort_order,
    })),
  })) as LocationDetails[];
};

export default function CheckInWizardPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const supabase = useClerkSupabaseClient();

  const mounted = useMounted();

  // Only start fetch once Clerk is loaded and signed in
  const shouldFetchClients = isLoaded && isSignedIn && !!supabase;

  const [step, setStep] = useState(0);

  // Centralised state for the entire check-in payload:
  const [client, setClient] = useState<Client | null>(null);
  const [addNewClient, setAddNewClient] = useState(false);

  const [vehicle, setVehicle] = useState<AssetWithStatus | null>(null);
  const [addNewVehicle, setAddNewVehicle] = useState(false);

  const [condition, setCondition] = useState<ConditionReportDraft | null>(null);
  // const [conditionFiles, setConditionFiles] = useState<File[]>([]);

  const [movement, setMovement] = useState<MovementState>({
    locationId: null,
    locationZoneId: null,
    notes: "",
    tagNumber: "",
    cover: "",
    charger: "",
    valeting: "not-requested",
    motRequired: false,
    motDate: null,
    serviceRequired: false,
    serviceDate: null,
  });

  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reportType = condition?.reportType ?? "check-in";
  const draftKey = `${reportType}::${client?.id ?? "none"}::${vehicle?.id ?? "none"}`;

  const lastDraftKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const prevKey = lastDraftKeyRef.current;
    if (prevKey === draftKey) return;

    // Compare previous & new vehicle ids inside the key (3rd segment)
    const prevVehicleId = prevKey?.split("::")[2] ?? "none";
    const newVehicleId = draftKey.split("::")[2] ?? "none";

    const isTempToRealSameVehicle =
      prevVehicleId.startsWith("temp-") &&
      newVehicleId !== "none" &&
      !newVehicleId.startsWith("temp-");

    if (isTempToRealSameVehicle) {
      // Vehicle just got a real id — keep the existing condition draft intact
      lastDraftKeyRef.current = draftKey;
      return;
    }

    // Otherwise (client changed, different vehicle, reportType changed): reset condition
    setCondition(null);
    // Optionally: setStep(2);
    lastDraftKeyRef.current = draftKey;
  }, [draftKey]);

  // Reset vehicle if client changes (to avoid vehicles from old client)
  useEffect(() => {
    setVehicle(null);
  }, [client?.id]);

  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    headingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  const {
    data: clients,
    error: clientsError,
    isLoading: clientsLoading,
  } = useSWR(shouldFetchClients ? "clients" : null, () =>
    fetchClients(supabase),
  );

  const selectedClientId =
    client?.id && !client.id.startsWith("temp-") ? client.id : null;

  // Fetch vehicles for the selected client
  const {
    data: vehicles,
    error: vehiclesError,
    isLoading: vehiclesLoading,
  } = useSWR<AssetWithStatus[]>(
    shouldFetchClients && selectedClientId
      ? `vehicles:${selectedClientId}`
      : null,
    () => fetchVehiclesForClient(supabase, selectedClientId!),
  );

  const {
    data: locations,
    error: locationsError,
    isLoading: locationsLoading,
  } = useSWR(shouldFetchClients ? "locations" : null, () =>
    fetchLocations(supabase),
  );

  // ---------- HYDRATION-SAFE FLAGS ----------
  // On the server and on the first client render, these evaluate to `true`,
  // so SSR and first client paint both show the same placeholder ("Loading…").
  const clientsHydrationLoading =
    !mounted || !isLoaded || !isSignedIn || !supabase || clientsLoading;

  const vehiclesHydrationLoading =
    !mounted || !(shouldFetchClients && selectedClientId) || vehiclesLoading;

  const locationsHydrationLoading =
    !mounted || !shouldFetchClients || locationsLoading;

  // Use "safe" data shaped by the flags
  const safeClients = useMemo(() => {
    return clientsHydrationLoading ? [] : (clients ?? []);
  }, [clientsHydrationLoading, clients]);

  const safeVehicles = useMemo<AssetWithStatus[]>(() => {
    return vehiclesHydrationLoading ? [] : (vehicles ?? []);
  }, [vehiclesHydrationLoading, vehicles]);

  const safeLocations = useMemo(() => {
    return locationsHydrationLoading ? [] : (locations ?? []);
  }, [locationsHydrationLoading, locations]);

  const checkedInForSelectedClient = useMemo(() => {
    return safeVehicles.filter((v) => v.isCheckedIn).length;
  }, [safeVehicles]);

  // Submit handler
  const handleFinalSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!client?.id)
        throw new Error("Please select or create a client before continuing.");
      if (!vehicle?.id)
        throw new Error("Please select or create a vehicle before continuing.");
      if (!condition?.id)
        throw new Error("Condition report is missing its id.");

      // 1) Flip status to 'submitted' and stamp submitted_at
      await submitReport(condition.id);

      // 2) Do the movement check-in (if this still belongs here)
      if (!movement.locationId) throw new Error("No location selected.");

      await checkInVehicle({
        assetId: vehicle.id,
        locationId: movement.locationId!,
        locationZoneId: movement.locationZoneId,
        conditionReportId: condition.id ?? null,
        notes: movement.notes.trim() ? movement.notes.trim() : null,
        storageDetails: {
          tagNumber: movement.tagNumber || null,
          cover: movement.cover || null,
          charger: movement.charger || null,
          valeting: movement.valeting || null,
          motRequired: movement.motRequired,
          motDate: movement.motDate,
          serviceRequired: movement.serviceRequired,
          serviceDate: movement.serviceDate,
        },
      });

      // 3) Refresh client vehicles & show success
      if (client.id) mutate(`vehicles:${client.id}`);
      setSuccess(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
      setSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    {
      label: addNewClient ? "New Client" : "Client",
      shortLabel: "Client",
      component: (
        <ClientFormStep
          value={client}
          onChange={setClient}
          onNext={() => setStep(1)}
          clientsList={safeClients}
          clientsLoading={clientsHydrationLoading}
          clientsError={clientsHydrationLoading ? undefined : clientsError}
          addNewClient={addNewClient}
          setAddNewClient={setAddNewClient}
          selectedClientCheckedInCount={checkedInForSelectedClient}
          selectedClientCheckedInLoading={vehiclesHydrationLoading}
        />
      ),
      icon: addNewClient ? <CircleX /> : <UserRoundPlus />,
      iconAction: () => {
        setClient(null);
        setAddNewClient((prev) => !prev);
      },
    },
    {
      label: addNewVehicle ? "New Vehicle" : "Vehicle Details",
      shortLabel: "Vehicle",
      component: (
        <VehicleFormStep
          value={vehicle}
          onChange={setVehicle}
          onNext={() => setStep(2)}
          onBack={() => setStep(0)}
          vehiclesList={safeVehicles}
          vehiclesLoading={vehiclesHydrationLoading}
          vehiclesError={vehiclesHydrationLoading ? undefined : vehiclesError}
          addNewVehicle={addNewVehicle}
          setAddNewVehicle={setAddNewVehicle}
          clientId={selectedClientId}
        />
      ),
      icon: addNewVehicle ? <CircleX /> : <Plus />,
      iconAction: () => {
        setVehicle(null);
        setAddNewVehicle((prev) => !prev);
      },
    },
    {
      label: "Vehicle Condition",
      shortLabel: "Condition",
      component: (
        <ConditionFormStep
          key={`${vehicle?.id}-${reportType}-${condition?.id ?? "new"}`}
          condition={condition}
          onChange={setCondition}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
          vehicleType={vehicle?.vehicleType}
          assetId={vehicle?.id ?? null}
          reportType={reportType}
        />
      ),
    },
    {
      label: "Storage Details",
      shortLabel: "Storage",
      component: (
        <MovementFormStep
          value={movement}
          onChange={setMovement}
          locationsList={safeLocations}
          locationsLoading={locationsHydrationLoading}
          locationsError={
            locationsHydrationLoading ? undefined : locationsError
          }
          onNext={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      ),
    },
    {
      label: "Confirm",
      shortLabel: "Confirm",
      component: (
        <ConfirmCheckInStep
          client={client}
          vehicle={vehicle}
          condition={condition}
          onBack={() => setStep(3)}
          onSubmit={handleFinalSubmit}
          error={error}
          isLoading={isLoading}
          movement={{
            ...movement, // <-- full MovementState
            locationName:
              safeLocations.find((l) => l.id === movement.locationId)?.name ??
              "",
          }}
        />
      ),
    },
  ];

  if (success) return <SuccessMessage />;

  return (
    <div className="flex w-full flex-col items-center">
      <div className="sticky top-18 z-20 mb-5 w-[351px] rounded-4xl border bg-[#FAFAFA] pt-4.5 pb-3.5 backdrop-blur md:top-26">
        <div className="flex w-full max-w-md justify-center gap-4">
          {steps.map((s, i) => (
            <div
              key={s.label}
              className={`flex flex-col items-center border-b-2 pb-1 transition-all ${
                i === step
                  ? "border-[#007AD2] font-medium text-[#007AD2]"
                  : "text-muted-foreground border-transparent"
              }`}
            >
              <span className="text-center text-xs">{s.shortLabel}</span>
            </div>
          ))}
        </div>
      </div>

      <MainCard>
        <MainCardHeader ref={headingRef} title={`${steps[step].label}`}>
          {steps[step].icon && (
            <IconButton onClick={steps[step].iconAction}>
              {steps[step].icon}
            </IconButton>
          )}
        </MainCardHeader>
        <MainCardContent>{steps[step].component}</MainCardContent>
      </MainCard>
    </div>
  );
}
