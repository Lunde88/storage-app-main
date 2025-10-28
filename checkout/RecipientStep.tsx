"use client";

import { useEffect, useRef, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { FormInput } from "@/components/base/form/FormInput";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

export type RecipientDetails = {
  recipientName: string;
  recipientEmail?: string;
  recipientPhone?: string;
  notes?: string;
};

export function RecipientStep({
  value,
  onChange,
}: {
  value: RecipientDetails;
  onChange: (v: RecipientDetails) => void;
}) {
  const [name, setName] = useState(value.recipientName ?? "");
  const [email, setEmail] = useState(value.recipientEmail ?? "");
  const [phone, setPhone] = useState(value.recipientPhone ?? "");
  const [notes, setNotes] = useState(value.notes ?? "");
  const [error, setError] = useState<string>("");

  const errorRef = useRef<HTMLDivElement>(null);

  // Keep parent state in sync
  useEffect(() => {
    onChange({
      recipientName: name,
      recipientEmail: email || undefined,
      recipientPhone: phone || undefined,
      notes: notes || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, email, phone, notes]);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      errorRef.current.focus?.();
    }
  }, [error]);

  return (
    <div className="space-y-4">
      {error && (
        <Alert
          variant="destructive"
          className="mb-3"
          ref={errorRef}
          tabIndex={-1}
        >
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <FormField label="Recipient name" htmlFor="recipient-name" required>
        <FormInput
          id="recipient-name"
          name="recipientName"
          placeholder="Recipient full name"
          value={name}
          onChange={(e) => {
            setError("");
            setName(e.target.value);
          }}
          autoComplete="name"
        />
      </FormField>

      <FormField label="Email (optional)" htmlFor="recipient-email">
        <FormInput
          id="recipient-email"
          name="recipientEmail"
          type="email"
          placeholder="Recipient email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </FormField>

      <FormField label="Phone (optional)" htmlFor="recipient-phone">
        <FormInput
          id="recipient-phone"
          name="recipientPhone"
          type="tel"
          placeholder="Recipient phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
        />
      </FormField>

      <FormField label="Notes (optional)" htmlFor="recipient-notes">
        <Textarea
          id="recipient-notes"
          name="notes"
          placeholder="Handover notes, ID checked, special instructions…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="!text-base"
        />
      </FormField>

      {/* No internal Next/Back – wizard handles navigation */}
    </div>
  );
}
