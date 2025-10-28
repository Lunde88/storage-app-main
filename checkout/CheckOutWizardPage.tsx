"use client";

import {
  useMemo,
  useState,
  useTransition,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { Button } from "@/components/ui/button";
import MainCard from "@/components/base/card/MainCard";
import MainCardHeader from "@/components/base/card/MainCardHeader";
import MainCardContent from "@/components/base/card/MainCardContent";
import ConditionStep from "@/components/checkin/ConditionStep"; // your default export
import type { ConditionReportDraft, VehicleType } from "@/lib/types";

import { finaliseCheckout } from "@/lib/actions/checkoutWizardActions";

// ---- Assume these exist with the shown props. If not, stub them to match. ----
// RecipientStep: captures who is taking the vehicle and optional contact/notes.
import { RecipientStep } from "@/components/checkout/RecipientStep";
// ChecklistStep: final handover ticks (paperwork, keys, etc.)
import { ChecklistStep } from "@/components/checkout/ChecklistStep";
// ConfirmStep: read-only summary.
import { ConfirmStep } from "@/components/checkout/ConfirmStep";
import { useRouter } from "next/navigation";

// ---------------- Types ----------------
type CurrentLocation = {
  id: string | null;
  name: string | null;
  zoneId: string | null;
  zoneName: string | null;
};

type ClientContact = {
  id: string;
  email: string | null;
  phone: string | null;
} | null;

type VehicleMeta = {
  make: string | null;
  model: string | null;
  colour: string | null;
  assetType: string | null;
  vehicleType: VehicleType | null;
};

export type CheckOutWizardProps = {
  client: string; // display label
  clientContact: ClientContact;
  vehicle: string; // display label (e.g., registration)
  vehicleId: string; // actual asset id
  vehicleLocation: string; // e.g., "Sheffield" or "Checked out"
  currentLocation: CurrentLocation;
  conditionReportId: string | null; // latest submitted (for seeding if needed)
  vehicleMeta?: VehicleMeta;
};

// Recipient state
type RecipientDetails = {
  recipientName: string;
  recipientEmail?: string;
  recipientPhone?: string;
  notes?: string;
};

// Checklist state
type ChecklistState = {
  paperworkSigned: boolean;
  keysReturned: boolean;
  damageDiscussed: boolean;
  fuelDocumented: boolean;
  extraNotes?: string;
};

// --------------- Component ---------------
export default function CheckOutWizardPage(props: CheckOutWizardProps) {
  const {
    client,
    clientContact,
    vehicle,
    vehicleId,
    // vehicleLocation,
    currentLocation,
    conditionReportId,
    vehicleMeta,
  } = props;

  const router = useRouter();

  // Single source of truth for the condition draft coming from ConditionStep
  const [conditionDraft, setConditionDraft] =
    useState<ConditionReportDraft | null>(null);

  // Other wizard state
  const [recipient, setRecipient] = useState<RecipientDetails>({
    recipientName: client,
    recipientEmail: clientContact?.email ?? "",
    recipientPhone: clientContact?.phone ?? "",
    notes: "",
  });

  const [checklist, setChecklist] = useState<ChecklistState>({
    paperworkSigned: false,
    keysReturned: false,
    damageDiscussed: false,
    fuelDocumented: false,
    extraNotes: "",
  });

  const steps = useMemo(
    () => [
      { key: "recipient", label: "Recipient", shortLabel: "Recipient" },
      { key: "condition", label: "Vehicle Condition", shortLabel: "Condition" },
      {
        key: "checklist",
        label: "Handover Checklist",
        shortLabel: "Checklist",
      },
      { key: "confirm", label: "Confirm", shortLabel: "Confirm" },
    ],
    [],
  );

  const [stepIndex, setStepIndex] = useState(0);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  const [isPending, startTransition] = useTransition();

  const goNext = useCallback(
    () => setStepIndex((i) => Math.min(i + 1, steps.length - 1)),
    [steps.length],
  );
  const goBack = useCallback(() => setStepIndex((i) => Math.max(i - 1, 0)), []);

  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [stepIndex]);

  useEffect(() => {
    headingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [stepIndex]);

  // The ConditionStep will create/ensure a DRAFT and reportId internally.
  // We can read it from conditionDraft?.id when finishing.
  const draftReportId = conditionDraft?.id ?? null;

  // Simple validation gate for Next button (recipient + checklist)
  const nextDisabled = useMemo(() => {
    const key = steps[stepIndex].key;
    if (key === "recipient") {
      return recipient.recipientName.trim().length === 0;
    }
    if (key === "checklist") {
      return !checklist.paperworkSigned; // require signature before confirm
    }
    // "condition" is handled inside ConditionStep (it calls onNext only when valid)
    return false;
  }, [steps, stepIndex, recipient, checklist]);

  // Finish = submit report then create the movement, via one server action
  const handleFinish = useCallback(() => {
    if (!draftReportId) {
      console.log("The condition draft isn’t ready yet.");
      return;
    }
    startTransition(async () => {
      try {
        await finaliseCheckout({
          assetId: vehicleId,
          draftReportId,
          recipient,
          checklist,
          context: {
            latestSubmittedReportId: conditionReportId,
            currentLocation,
          },
        });
        console.log("Check-out complete.");
        router.push(`/vehicle/${vehicleId}`);
        router.refresh();
      } catch (e) {
        console.error(e);
      }
    });
  }, [
    draftReportId,
    vehicleId,
    recipient,
    checklist,
    conditionReportId,
    currentLocation,
  ]);

  return (
    <div className="flex w-full flex-col items-center">
      <div className="sticky top-18 z-20 mb-5 w-[351px] rounded-4xl border bg-[#FAFAFA] pt-4.5 pb-3.5 backdrop-blur md:top-26">
        <div className="flex w-full max-w-md justify-center gap-4">
          {steps.map((s, i) => (
            <div
              key={s.key}
              className={`flex flex-col items-center border-b-2 pb-1 transition-all ${
                i === stepIndex
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
        <MainCardHeader ref={headingRef} title={`${steps[stepIndex].label}`} />
        <MainCardContent>
          {/* Recipient */}
          {steps[stepIndex].key === "recipient" && (
            <RecipientStep value={recipient} onChange={setRecipient} />
          )}

          {/* Condition (your existing step). It handles its own validation + Next. */}
          {steps[stepIndex].key === "condition" && (
            <ConditionStep
              condition={conditionDraft}
              onChange={setConditionDraft}
              onNext={goNext}
              onBack={goBack}
              vehicleType={vehicleMeta?.vehicleType ?? undefined}
              assetId={vehicleId}
              reportType="check-out"
            />
          )}

          {/* Checklist */}
          {steps[stepIndex].key === "checklist" && (
            <ChecklistStep value={checklist} onChange={setChecklist} />
          )}

          {/* Confirm */}
          {steps[stepIndex].key === "confirm" && (
            <ConfirmStep
              summary={
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Vehicle: </span>
                    <span className="font-medium uppercase">{vehicle}</span>
                    {vehicleMeta?.make || vehicleMeta?.model ? (
                      <>
                        {" "}
                        — {vehicleMeta?.make} {vehicleMeta?.model}
                      </>
                    ) : null}
                  </div>

                  <div>
                    <span className="text-muted-foreground">Recipient: </span>
                    <span className="font-medium">
                      {recipient.recipientName}
                    </span>
                    {recipient.recipientEmail
                      ? ` · ${recipient.recipientEmail}`
                      : ""}
                    {recipient.recipientPhone
                      ? ` · ${recipient.recipientPhone}`
                      : ""}
                    {recipient.notes ? (
                      <div className="text-muted-foreground mt-1">
                        Notes: {recipient.notes}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <span className="text-muted-foreground">Checklist: </span>
                    <ul className="ml-4 list-disc">
                      <li>
                        Paperwork signed:{" "}
                        {checklist.paperworkSigned ? "Yes" : "No"}
                      </li>
                      <li>
                        Keys returned: {checklist.keysReturned ? "Yes" : "No"}
                      </li>
                      <li>
                        Damage discussed:{" "}
                        {checklist.damageDiscussed ? "Yes" : "No"}
                      </li>
                      <li>
                        Fuel documented:{" "}
                        {checklist.fuelDocumented ? "Yes" : "No"}
                      </li>
                    </ul>
                    {checklist.extraNotes ? (
                      <div className="text-muted-foreground mt-1">
                        Extra notes: {checklist.extraNotes}
                      </div>
                    ) : null}
                  </div>
                </div>
              }
            />
          )}

          {/* Nav (hide on Condition step because it renders its own Back/Next) */}
          {steps[stepIndex].key !== "condition" && (
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                onClick={goBack}
                disabled={isFirst || isPending}
              >
                Back
              </Button>

              {!isLast ? (
                <Button onClick={goNext} disabled={nextDisabled || isPending}>
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleFinish}
                  disabled={isPending || !draftReportId}
                >
                  {isPending ? "Checking out…" : "Finish & Check Out"}
                </Button>
              )}
            </div>
          )}
        </MainCardContent>
      </MainCard>
    </div>
  );
}
