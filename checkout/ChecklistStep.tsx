"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/forms/FormField";

export type ChecklistState = {
  paperworkSigned: boolean;
  keysReturned: boolean;
  damageDiscussed: boolean;
  fuelDocumented: boolean;
  extraNotes?: string;
};

export function ChecklistStep({
  value,
  onChange,
}: {
  value: ChecklistState;
  onChange: (v: ChecklistState) => void;
}) {
  const [paperworkSigned, setPaperworkSigned] = useState(value.paperworkSigned);
  const [keysReturned, setKeysReturned] = useState(value.keysReturned);
  const [damageDiscussed, setDamageDiscussed] = useState(value.damageDiscussed);
  const [fuelDocumented, setFuelDocumented] = useState(value.fuelDocumented);
  const [extraNotes, setExtraNotes] = useState(value.extraNotes ?? "");

  useEffect(() => {
    onChange({
      paperworkSigned,
      keysReturned,
      damageDiscussed,
      fuelDocumented,
      extraNotes: extraNotes || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    paperworkSigned,
    keysReturned,
    damageDiscussed,
    fuelDocumented,
    extraNotes,
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="paperworkSigned" className="font-medium">
          Paperwork signed
        </Label>
        <Switch
          id="paperworkSigned"
          checked={paperworkSigned}
          onCheckedChange={setPaperworkSigned}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="keysReturned" className="font-medium">
          Keys handed over / recorded
        </Label>
        <Switch
          id="keysReturned"
          checked={keysReturned}
          onCheckedChange={setKeysReturned}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="damageDiscussed" className="font-medium">
          Existing damage discussed with recipient
        </Label>
        <Switch
          id="damageDiscussed"
          checked={damageDiscussed}
          onCheckedChange={setDamageDiscussed}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="fuelDocumented" className="font-medium">
          Fuel/charge level documented
        </Label>
        <Switch
          id="fuelDocumented"
          checked={fuelDocumented}
          onCheckedChange={setFuelDocumented}
        />
      </div>

      <FormField label="Extra notes (optional)" htmlFor="checkout-extra-notes">
        <Textarea
          id="checkout-extra-notes"
          placeholder="Add any final remarks about the handover…"
          value={extraNotes}
          onChange={(e) => setExtraNotes(e.target.value)}
          className="!text-base"
        />
      </FormField>
    </div>
  );
}
