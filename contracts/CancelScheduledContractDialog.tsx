"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cancelScheduledContractAction } from "@/lib/server-actions/contracts";
import * as React from "react";

export function CancelScheduledContractDialog({
  contractId,
  assetId,
  triggerLabel = "Cancel scheduled contract",
}: {
  contractId: string;
  assetId: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel scheduled contract?</DialogTitle>
          <DialogDescription>
            This will remove the scheduled contract (soft delete). You can
            create another later if needed.
          </DialogDescription>
        </DialogHeader>

        {/* Server action form: no client hooks needed */}
        <form
          action={async (fd: FormData) => {
            await cancelScheduledContractAction(fd);
            // dialog will close upon redirect
          }}
        >
          <input type="hidden" name="contractId" value={contractId} />
          <input type="hidden" name="assetId" value={assetId} />
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Keep
            </Button>
            <Button type="submit" variant="destructive">
              Cancel contract
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
