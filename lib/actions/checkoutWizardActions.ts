// lib/actions/checkoutWizardActions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { getServerSupabaseClient } from "@/lib/supabaseServer";
import { submitReport } from "@/lib/actions/conditionReportActions";
import { checkOutVehicle } from "@/lib/actions/movementActions";

// ---- Types (kept local to this action) ----
export type RecipientDetails = {
  recipientName: string;
  recipientEmail?: string;
  recipientPhone?: string;
  notes?: string;
};

export type ChecklistState = {
  paperworkSigned: boolean;
  keysReturned: boolean;
  damageDiscussed: boolean;
  fuelDocumented: boolean;
  extraNotes?: string;
};

type CurrentLocation = {
  id: string | null;
  name: string | null;
  zoneId: string | null;
  zoneName: string | null;
};

export type FinaliseCheckoutArgs = {
  assetId: string;
  draftReportId: string;
  recipient: RecipientDetails;
  checklist: ChecklistState;
  context?: {
    latestSubmittedReportId?: string | null; // for audit only
    currentLocation?: CurrentLocation | null; // if your page already fetched it
  };
};

/**
 * Locks the draft report and creates a linked check-out movement.
 * Returns IDs for further routing or logging.
 */
export async function finaliseCheckout(args: FinaliseCheckoutArgs): Promise<{
  conditionReportId: string;
  movementId: string;
}> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) throw new Error("Not authorised");

  const { assetId, draftReportId, recipient, checklist, context } = args;

  // 1) Lock the draft (turns it into a submitted condition report).
  await submitReport(draftReportId);

  const conditionReportId: string = draftReportId;

  // 2) Find the location we’re checking out FROM.
  // Prefer the location passed from the page (already derived). If absent, read last movement.
  let locationId: string | null = context?.currentLocation?.id ?? null;
  let locationZoneId: string | null = context?.currentLocation?.zoneId ?? null;

  if (!locationId) {
    const supabase = await getServerSupabaseClient();
    const { data: lastMove, error: lastErr } = await supabase
      .from("asset_movements")
      .select("to_location_id, to_location_zone_id, event_type")
      .is("deleted_at", null)
      .eq("asset_id", assetId)
      .eq("clerk_organisation_id", orgId)
      .order("movement_time", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastErr || !lastMove) {
      throw new Error(
        "Unable to determine the current location for check-out.",
      );
    }
    locationId = lastMove.to_location_id;
    locationZoneId = lastMove.to_location_zone_id ?? null;
  }

  if (!locationId) {
    throw new Error("Current location is required to check out this asset.");
  }

  // 3) Build readable notes and structured storage details.

  const storageDetails: Record<string, unknown> = {
    paperworkSigned: !!checklist.paperworkSigned,
    keysReturned: !!checklist.keysReturned,
    damageDiscussed: !!checklist.damageDiscussed,
    fuelDocumented: !!checklist.fuelDocumented,
    recipient: {
      name: recipient.recipientName?.trim() || null,
      email: recipient.recipientEmail?.trim() || null,
      phone: recipient.recipientPhone?.trim() || null,
    },
    _seededFromReportId: context?.latestSubmittedReportId ?? null,
  };

  const textNotes = [
    recipient?.notes?.trim(),
    checklist?.extraNotes?.trim(),
  ].filter(Boolean);

  const notes = textNotes.length ? textNotes.join("\n") : null;

  // 4) Create the movement (validation happens inside checkOutVehicle).
  const { id: movementId } = await checkOutVehicle({
    assetId,
    locationId,
    locationZoneId,
    conditionReportId,
    notes,
    storageDetails,
  });

  return { conditionReportId, movementId };
}
