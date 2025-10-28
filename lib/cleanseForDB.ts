// helpers for insert
import { SnakeKeys, keysToSnakeCase } from "@/utils/case";
import {
  AssetType,
  ConditionReport,
  DamagedPart,
  MovementInsertInput,
  VehicleType,
} from "./types";

// helpers
function tidy(v?: string | null) {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s.length ? s : undefined;
}
function toNull<T>(v: T | undefined) {
  return v === undefined ? null : (v as T);
}
function emptyObjectToNull<T extends object | undefined>(o: T) {
  if (!o) return null;
  return Object.keys(o).length ? o : null;
}

// --- Cleanses Client object for DB insert ---
export type ClientInsertInput = {
  firstName: string;
  lastName: string;
  companyName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postcode?: string;
  country?: string;
  notes?: string;
  referenceNumber?: string;
  customFields?: Record<string, string | number | boolean>;
};

export type DbClientInsert = {
  first_name: string;
  last_name: string;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  postcode?: string | null;
  country?: string | null;
  notes?: string | null;
  reference_number?: string | null;
  custom_fields?: Record<string, string | number | boolean> | null;
};

export function cleanseClientForDB(input: ClientInsertInput): DbClientInsert {
  // trim + drop blanks/nullish; lowercase email
  const cleaned = {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    companyName: tidy(input.companyName),
    email: tidy(input.email?.toLowerCase()),
    phone: tidy(input.phone),
    addressLine1: tidy(input.addressLine1),
    addressLine2: tidy(input.addressLine2),
    city: tidy(input.city),
    postcode: tidy(input.postcode),
    country: tidy(input.country),
    notes: tidy(input.notes),
    referenceNumber: tidy(input.referenceNumber),
    customFields: emptyObjectToNull(input.customFields),
  };

  return {
    first_name: cleaned.firstName,
    last_name: cleaned.lastName,
    company_name: toNull(cleaned.companyName),
    email: toNull(cleaned.email),
    phone: toNull(cleaned.phone),
    address_line1: toNull(cleaned.addressLine1),
    address_line2: toNull(cleaned.addressLine2),
    city: toNull(cleaned.city),
    postcode: toNull(cleaned.postcode),
    country: toNull(cleaned.country),
    notes: toNull(cleaned.notes),
    reference_number: toNull(cleaned.referenceNumber),
    custom_fields: cleaned.customFields,
  };
}

// --- Cleanses Asset/Vehicle object for DB insert ---

// types for DB insert (only the columns you actually send)
export type AssetInsertInput = {
  clientId: string;
  identifier: string;
  vinNumber?: string;
  assetType: AssetType;
  vehicleType?: VehicleType;
  make?: string;
  model?: string;
  colour?: string;
  year?: number;
  storageSlot?: string;
  notes?: string;
  barcode?: string;
  rfidTag?: string;
  quantity?: number;
  customFields?: Record<string, string | number | boolean>;
};

// DB shape for insert
export type DbAssetInsert = {
  client_id: string;
  identifier: string;
  vin_number?: string | null;
  asset_type: string;
  vehicle_type?: string | null;
  make?: string | null;
  model?: string | null;
  colour?: string | null;
  year?: number | null;
  storage_slot?: string | null;
  notes?: string | null;
  barcode?: string | null;
  rfid_tag?: string | null;
  quantity?: number | null;
  custom_fields?: Record<string, string | number | boolean> | null;
  // no org, no created_by_user_id – DB defaults handle these
};

export function cleanseAssetInsertForDB(
  input: AssetInsertInput,
): DbAssetInsert {
  const cleaned = {
    clientId: input.clientId,
    identifier: input.identifier.trim(),
    vinNumber: tidy(input.vinNumber),
    assetType: input.assetType,
    vehicleType: tidy(input.vehicleType),
    make: tidy(input.make),
    model: tidy(input.model),
    colour: tidy(input.colour),
    year: input.year,
    storageSlot: tidy(input.storageSlot),
    notes: tidy(input.notes),
    barcode: tidy(input.barcode),
    rfidTag: tidy(input.rfidTag),
    quantity: input.quantity,
    customFields: emptyObjectToNull(input.customFields),
  };

  return {
    client_id: cleaned.clientId,
    identifier: cleaned.identifier,
    vin_number: toNull(cleaned.vinNumber),
    asset_type: cleaned.assetType,
    vehicle_type: toNull(cleaned.vehicleType),
    make: toNull(cleaned.make),
    model: toNull(cleaned.model),
    colour: toNull(cleaned.colour),
    year: cleaned.year ?? null,
    storage_slot: toNull(cleaned.storageSlot),
    notes: toNull(cleaned.notes),
    barcode: toNull(cleaned.barcode),
    rfid_tag: toNull(cleaned.rfidTag),
    quantity: cleaned.quantity ?? null,
    custom_fields: cleaned.customFields,
  };
}

// --- Cleanses ConditionReport for DB insert ---
export function cleanseConditionReportForDB(
  condition: ConditionReport | { [k: string]: unknown },
): SnakeKeys<Omit<ConditionReport, "id">> {
  const result: Partial<ConditionReport> = {};

  for (const [key, value] of Object.entries(condition)) {
    if (key === "id") continue;

    if (typeof value === "string" && value.trim() === "") continue;
    if (value == null) continue;

    if (key === "damagedParts" && Array.isArray(value)) {
      result.damagedParts = (
        value as (DamagedPart & { photoFile?: File })[]
      ).map(({ ...rest }) => rest);
      continue;
    }

    // @ts-expect-error dynamic assignment
    result[key] = value;
  }

  return keysToSnakeCase(result) as SnakeKeys<Omit<ConditionReport, "id">>;
}

export function cleanseMovementEventForDB(
  movement: MovementInsertInput,
): SnakeKeys<MovementInsertInput> {
  const result: Partial<MovementInsertInput> = {};

  for (const [key, value] of Object.entries(movement)) {
    if (typeof value === "string" && value.trim() === "") continue;
    if (value == null) continue; // skips undefined/null
    // @ts-expect-error dynamic assignment
    result[key] = value;
  }

  return keysToSnakeCase(result) as SnakeKeys<MovementInsertInput>;
}
