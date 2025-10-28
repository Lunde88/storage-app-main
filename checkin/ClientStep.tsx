"use client";
import { useEffect, useRef, useState } from "react";

import { Client } from "@/lib/types/index";
import { Textarea } from "../ui/textarea";
import { FormField } from "../forms/FormField";
import { ClientCombobox } from "../forms/ClientCombobox";
import { Alert, AlertDescription } from "../ui/alert";
import { useRouter } from "next/navigation";
import { ConfirmCancelModal } from "@/components/ConfirmCancelModal";
import { FormInput } from "../base/form/FormInput";
import CancelButton from "../base/buttons/CancelButton";
import NextButton from "../base/buttons/NextButton";
import CardDivider from "../base/card/CardDivider";

import { insertClient } from "@/lib/actions/clientActions";
import { mutate } from "swr";
import { ClientInsertInput } from "@/lib/cleanseForDB";

type ClientFormProps = {
  value: Client | null;
  onChange: (client: Client | null) => void;
  onNext: () => void;

  clientsList: Client[];
  clientsLoading: boolean;
  clientsError: Error | undefined;
  addNewClient: boolean;
  setAddNewClient: (value: boolean) => void;
  selectedClientCheckedInCount?: number;
  selectedClientCheckedInLoading?: boolean;
};

export default function ClientStep({
  value,
  onChange,
  onNext,
  clientsList,
  clientsLoading,
  clientsError,
  addNewClient,
  setAddNewClient,
  selectedClientCheckedInCount,
  selectedClientCheckedInLoading,
}: ClientFormProps) {
  const router = useRouter();
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const [formError, setFormError] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);

  const [firstName, setFirstName] = useState(value?.firstName || "");
  const [lastName, setLastName] = useState(value?.lastName || "");
  const [companyName, setCompanyName] = useState(value?.companyName || "");
  const [email, setEmail] = useState(value?.email || "");
  const [phone, setPhone] = useState(value?.phone || "");
  const [addressLine1, setAddressLine1] = useState(value?.addressLine1 || "");
  const [addressLine2, setAddressLine2] = useState(value?.addressLine2 || "");
  const [city, setCity] = useState(value?.city || "");
  const [postcode, setPostcode] = useState(value?.postcode || "");
  const [country, setCountry] = useState(value?.country || "");
  const [notes, setNotes] = useState(value?.notes || "");
  const [referenceNumber, setReferenceNumber] = useState(
    value?.referenceNumber || "",
  );
  const isExistingClient = !!(value?.id && !value.id.startsWith("temp-"));

  const [submitting, setSubmitting] = useState(false);

  const canProceed = addNewClient
    ? firstName.trim() !== "" && lastName.trim() !== ""
    : !!(value && value.id);

  // When client is selected from Combobox, prefill the form

  const handleSelectClient = (client: Client | null) => {
    setFormError("");
    if (!client) {
      // “Add new client” clicked in the combobox
      onChange(null); // clear current selection
      setAddNewClient?.(true); // show the new-client form
      return;
    }
    // Existing client selected
    setAddNewClient?.(false);
    onChange(client);
    // If you want to auto-advance on selection:
    // onNext();
  };

  // Example for customFields as key-value pairs
  const [customFields, setCustomFields] = useState<
    Record<string, string | number | boolean>
  >(value?.customFields || {});

  useEffect(() => {
    if (value) {
      setFirstName(value.firstName || "");
      setLastName(value.lastName || "");
      setCompanyName(value.companyName || "");
      setEmail(value.email || "");
      setPhone(value.phone || "");
      setAddressLine1(value.addressLine1 || "");
      setAddressLine2(value.addressLine2 || "");
      setCity(value.city || "");
      setPostcode(value.postcode || "");
      setCountry(value.country || "");
      setNotes(value.notes || "");
      setReferenceNumber(value.referenceNumber || "");
      setCustomFields(value.customFields || {});
    } else {
      // If no value (new client), clear all fields
      setFirstName("");
      setLastName("");
      setCompanyName("");
      setEmail("");
      setPhone("");
      setAddressLine1("");
      setAddressLine2("");
      setCity("");
      setPostcode("");
      setCountry("");
      setNotes("");
      setReferenceNumber("");
      setCustomFields({});
    }
  }, [value]);

  useEffect(() => {
    if (formError && errorRef.current) {
      // Scroll smoothly to the error message
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      // Optionally, focus the error for accessibility
      errorRef.current.focus?.();
    }
  }, [formError]);

  // CHANGED: async + incremental insert
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Existing client selected: just continue
    if (isExistingClient) {
      setFormError("");
      onNext();
      return;
    }

    // New client validation
    if (!firstName.trim() || !lastName.trim()) {
      setFormError(
        addNewClient
          ? "Please enter the client's first and last name."
          : "Please select or add a client.",
      );
      return;
    }

    setFormError("");
    setSubmitting(true);

    // Build the payload your server action expects (camelCase -> action maps to snake_case)
    const payload: ClientInsertInput = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      companyName: companyName || undefined,
      email: email || undefined,
      phone: phone || undefined,
      addressLine1: addressLine1 || undefined,
      addressLine2: addressLine2 || undefined,
      city: city || undefined,
      postcode: postcode || undefined,
      country: country || undefined,
      notes: notes || undefined,
      referenceNumber: referenceNumber || undefined,
      customFields: Object.keys(customFields).length ? customFields : undefined,
    };

    try {
      // IMPORTANT: persist immediately – returns the real row with id
      const created = await insertClient(payload); // server action
      await mutate("clients");

      // Hand real client (with id) up to the wizard
      // onChange({
      //   ...payload,
      //   id: created.id, // <- use the ID from DB
      //   label: created.label, // optional; your trigger sets it
      // });
      onChange(created);

      // Flip UI back to "existing client mode" and move on
      setAddNewClient(false);
      onNext();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to create client. Please try again.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {formError && (
        <Alert
          variant="destructive"
          className="mb-3"
          ref={errorRef}
          tabIndex={-1}
        >
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      {!addNewClient && (
        <>
          <ClientCombobox
            clientsList={clientsList}
            value={value}
            onChange={handleSelectClient}
            loading={clientsLoading}
            error={clientsError}
          />
          {isExistingClient && value && (
            <div className="mb-4 rounded-[12px] border bg-[#FAFAFA] p-3 text-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="mb-1 text-lg font-bold">
                  {value.firstName} {value.lastName}
                </div>
                <p className="font-medium text-[#B23A48]">Edit</p>
              </div>
              <div className="space-y-5">
                {value.companyName && (
                  <div>
                    <p className="text-xs text-[#5C5757]/80">Company</p>
                    <span className="font-medium">{value.companyName}</span>
                  </div>
                )}
                {value.phone && (
                  <div>
                    <p className="text-xs text-[#5C5757]/80">Telephone</p>
                    <span className="font-medium">{value.phone}</span>
                  </div>
                )}
                {value.email && (
                  <div>
                    <p className="text-xs text-[#5C5757]/80">Email</p>
                    <span className="font-medium">{value.email}</span>
                  </div>
                )}

                {(value.addressLine1 ||
                  value.addressLine2 ||
                  value.city ||
                  value.postcode ||
                  value.country) && (
                  <div>
                    <p className="text-xs text-[#5C5757]/80">Address</p>
                    <span className="font-medium">
                      {[
                        value.addressLine1,
                        value.addressLine2,
                        value.city,
                        value.postcode,
                        value.country,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-3 space-y-3">
                <CardDivider />
                <p className="inline-block rounded-sm bg-[#F0F1FF] px-1 py-0.5 text-xs text-[#2D3ECD]">
                  {selectedClientCheckedInLoading ? (
                    <span className="opacity-70">Checking…</span>
                  ) : (
                    <>
                      <span className="font-bold">
                        {selectedClientCheckedInCount ?? 0}
                      </span>{" "}
                      vehicle
                      {(selectedClientCheckedInCount ?? 0) === 1
                        ? ""
                        : "s"}{" "}
                      checked in
                    </>
                  )}
                </p>
              </div>
            </div>
          )}
        </>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {addNewClient && (
          <>
            <FormField label="First name" htmlFor="first-name" required>
              <FormInput
                id="first-name"
                name="firstName"
                placeholder="Joe"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                disabled={isExistingClient || submitting}
              />
            </FormField>

            <FormField label="Last name" htmlFor="last-name" required>
              <FormInput
                id="last-name"
                name="lastName"
                placeholder="Smith"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                disabled={isExistingClient || submitting}
              />
            </FormField>

            <FormField label="Company name" htmlFor="company-name">
              <FormInput
                id="company-name"
                name="companyName"
                placeholder="Business Ltd"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                autoComplete="organization"
                disabled={isExistingClient || submitting}
              />
            </FormField>

            <FormField label="Email" htmlFor="email">
              <FormInput
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={isExistingClient || submitting}
              />
            </FormField>

            <FormField label="Phone" htmlFor="phone">
              <FormInput
                id="phone"
                name="phone"
                type="tel"
                placeholder="+44 7911 123456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                disabled={isExistingClient || submitting}
              />
            </FormField>

            <FormField label="Address Line 1" htmlFor="address-line1">
              <FormInput
                id="address-line1"
                name="addressLine1"
                placeholder="123 Example Road"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                autoComplete="address-line1"
                disabled={isExistingClient || submitting}
              />
            </FormField>

            <FormField label="Address Line 2" htmlFor="address-line2">
              <FormInput
                id="address-line2"
                name="addressLine2"
                placeholder="Apartment 4B"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                autoComplete="address-line2"
                disabled={isExistingClient || submitting}
              />
            </FormField>

            <FormField label="City" htmlFor="city">
              <FormInput
                id="city"
                name="city"
                placeholder="Sheffield"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                autoComplete="address-level2"
                disabled={isExistingClient || submitting}
              />
            </FormField>

            <FormField label="Postcode" htmlFor="postcode">
              <FormInput
                id="postcode"
                name="postcode"
                placeholder="S10 1AA"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                autoComplete="postal-code"
                disabled={isExistingClient || submitting}
              />
            </FormField>

            <FormField label="Country" htmlFor="country">
              <FormInput
                id="country"
                name="country"
                placeholder="United Kingdom"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                autoComplete="country"
                disabled={isExistingClient || submitting}
              />
            </FormField>

            <FormField label="Notes" htmlFor="notes">
              <Textarea
                id="notes"
                name="notes"
                placeholder="Additional notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isExistingClient || submitting}
              />
            </FormField>

            <FormField label="Reference number" htmlFor="reference-number">
              <FormInput
                id="reference-number"
                name="referenceNumber"
                placeholder="REF12345"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                disabled={isExistingClient || submitting}
              />
            </FormField>
          </>
        )}

        <div className="mt-4 flex gap-2">
          <CancelButton
            onClick={() => setCancelConfirmOpen(true)}
            text="Back to dashboard"
            className="flex-1"
          />
          <NextButton
            disabled={!canProceed || submitting}
            className="flex-1"
            type="submit"
          />
        </div>
      </form>
      <ConfirmCancelModal
        open={cancelConfirmOpen}
        onClose={() => setCancelConfirmOpen(false)}
        onConfirm={() => {
          setCancelConfirmOpen(false);
          router.push("/dashboard");
        }}
        title="Cancel Check-In?"
        description="Are you sure you want to abandon the check-in process? All progress will be lost."
        confirmLabel="Abandon Check-In"
        cancelLabel="Go Back"
      />
    </div>
  );
}
