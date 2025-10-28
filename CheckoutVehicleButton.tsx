"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { transferVehicle } from "@/lib/actions/movementActions";
import LocationDropdown from "./LocationDropdown";
import { useOrganization } from "@clerk/nextjs";

// NEW: the value we expect back from LocationDropdown
export type DestinationSelection = {
  locationId: string | null;
  locationName?: string | null;
  zoneId?: string | null; // null = no zone selected; undefined = location has no zones
  zoneName?: string | null;
  requiresZone?: boolean; // optional: dropdown can tell us if a zone is required
};

export function CheckoutVehicleButton({
  assetId,
  disabled,
  currentLocation,
}: {
  assetId: string;
  disabled?: boolean;
  currentLocation?: {
    id: string | null;
    name: string | null;
    zoneId?: string | null;
    zoneName?: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"checkout" | "transfer">("checkout");
  const [selected, setSelected] = useState<DestinationSelection>({
    locationId: null,
    zoneId: undefined,
  });

  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { organization } = useOrganization();

  // When user switches to transfer, reset destination
  useEffect(() => {
    if (mode === "transfer") {
      setSelected({ locationId: null, zoneId: undefined });
    }
  }, [mode]);

  const requiresZone = !!selected.requiresZone;
  const hasChosenLocation = !!selected.locationId;

  const hasValidZone = !requiresZone || Boolean(selected.zoneId);

  // Allow transfer when location is the same BUT zone changes.
  const isSameLocation = selected.locationId === currentLocation?.id;
  const isSameZone =
    (selected.zoneId ?? null) === (currentLocation?.zoneId ?? null);
  const noOpTransfer = isSameLocation && isSameZone;

  const confirmText =
    mode === "checkout"
      ? "Continue to Check-Out"
      : isPending
        ? "Transferring…"
        : "Confirm Transfer";

  const confirmDisabled =
    !!isPending ||
    !!disabled ||
    (mode === "transfer" &&
      (!hasChosenLocation || !hasValidZone || noOpTransfer));

  const handleConfirm = async () => {
    setError(null);
    setIsPending(true);
    try {
      if (mode === "checkout") {
        setIsPending(false);
        setOpen(false);
        router.push(`/vehicle/${assetId}/check-out`);
        return;
      } else {
        if (!selected.locationId)
          throw new Error("Choose a destination to transfer the vehicle.");
        if (isSameLocation && isSameZone) {
          throw new Error(
            "Choose a different sub-location or a different location.",
          );
        }
        if (requiresZone && !selected.zoneId) {
          throw new Error("Select a sub-location for the destination.");
        }

        await transferVehicle({
          assetId,
          fromLocationId: currentLocation?.id ?? null,
          toLocationId: selected.locationId,
          toLocationZoneId: selected.zoneId ?? null, // NEW: pass zone when present
          notes: "Transferred via dashboard",
        });
      }

      setIsPending(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setOpen(false);
        router.refresh();
      }, 1200);
    } catch (e) {
      setIsPending(false);
      setError(
        e instanceof Error
          ? e.message
          : "Could not complete action. Try again.",
      );
    }
  };

  // Reset modal state on close
  useEffect(() => {
    if (!open) {
      setIsPending(false);
      setIsSuccess(false);
      setError(null);
      setMode("checkout");
      setSelected({ locationId: null, zoneId: undefined });
    }
  }, [open]);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="destructive"
        disabled={isPending || disabled}
        className="mt-4"
      >
        Move / Check Out
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 className="mb-3 text-green-600" size={52} />
              <div className="mb-1 text-xl font-semibold">
                {mode === "checkout"
                  ? "Vehicle checked out!"
                  : "Vehicle transferred!"}
              </div>
              <div className="text-muted-foreground text-sm">
                The vehicle’s status has been updated.
              </div>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>
                  {mode === "checkout"
                    ? "Check Out Vehicle"
                    : "Transfer Vehicle"}
                </DialogTitle>
                <DialogDescription>
                  {mode === "checkout"
                    ? "You'll complete the check-out on the next screen."
                    : "Moves the vehicle to another on-site location."}
                </DialogDescription>
              </DialogHeader>

              <div className="mb-2 text-sm">
                <span className="text-muted-foreground">Currently at:</span>{" "}
                {currentLocation?.name ? (
                  <>
                    <span className="font-medium">{currentLocation.name}</span>
                    {currentLocation.zoneName && (
                      <span className="text-muted-foreground">
                        {" "}
                        — {currentLocation.zoneName}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground">
                    Unknown location
                  </span>
                )}
                {currentLocation?.zoneName && (
                  <span className="text-muted-foreground">
                    {" "}
                    — {currentLocation.zoneName}
                  </span>
                )}
              </div>

              {/* Action selector */}
              <div className="mt-3">
                <Label className="text-muted-foreground mb-2 block text-xs tracking-wide uppercase">
                  Action
                </Label>
                <RadioGroup
                  className="grid gap-3 md:grid-cols-2"
                  value={mode}
                  onValueChange={(v) => setMode(v as typeof mode)}
                  disabled={isPending}
                >
                  <div className="flex items-center space-x-2 rounded border p-3">
                    <RadioGroupItem value="checkout" id="mode-checkout" />
                    <Label htmlFor="mode-checkout">
                      Check Out (Leaves site)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 rounded border p-3">
                    <RadioGroupItem value="transfer" id="mode-transfer" />
                    <Label htmlFor="mode-transfer">Transfer (Site move)</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Destination picker only for transfer */}
              {mode === "transfer" && (
                <div className="mt-4">
                  <Label className="text-muted-foreground mb-2 block text-xs tracking-wide uppercase">
                    Destination
                  </Label>

                  {/* UPDATED: LocationDropdown now returns both location and (optional) zone */}
                  <LocationDropdown
                    orgId={organization?.id ?? ""}
                    value={selected}
                    onSelect={(sel: DestinationSelection) => setSelected(sel)}
                    disabled={isPending}
                    currentLocationId={currentLocation?.id ?? undefined}
                    currentZoneId={currentLocation?.zoneId ?? undefined}
                    excludeCurrent={false}
                    allowSelectCurrent
                    // Optional: if your dropdown doesn't know requiresZone,
                    // you can omit it; we'll treat zone as optional unless provided.
                  />
                </div>
              )}

              {error && (
                <div className="text-destructive mt-2 mb-2 text-sm">
                  {error}
                </div>
              )}

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={isPending}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  variant={mode === "checkout" ? "default" : "default"}
                  onClick={handleConfirm}
                  disabled={confirmDisabled}
                >
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {confirmText}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
