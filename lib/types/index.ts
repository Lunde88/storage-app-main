export const TEST_USER_ID = "c3817e9a-aaaa-4e90-aaaa-1aaaaaaa0001";
export const TEST_LOCATION_ID = "1f93c2b3-aaaa-4d71-aaaa-1aaaaaaa0001";
export const TEST_ORGANISATION_ID = "org_2y3CdspUyWMh65Jik6g2G31reVw";

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;

// --- Enums & Constants ---

export const ASSET_TYPES = [
  "car",
  "van",
  "motorcycle",
  "caravan",
  "campervan",
] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const CAR_PARTS = [
  "front bumper",
  "rear bumper",
  "nearside door",
  "offside door",
  "bonnet",
  "roof",
  "boot",
  "front windscreen",
  "rear windscreen",
  "nearside wing",
  "offside wing",
  "nearside mirror",
  "offside mirror",
  "front left tyre",
  "front right tyre",
  "rear left tyre",
  "rear right tyre",
  "alloy wheels",
  "lights",
  "grille",
  "number plate",
  "interior",
  "engine bay",
  "other",
] as const;
export type CarPart = (typeof CAR_PARTS)[number] | string;

// export const CONDITION_STATUSES = [
//   "excellent",
//   "good",
//   "fair",
//   "damaged",
// ] as const;
// export type ConditionStatus = (typeof CONDITION_STATUSES)[number];

export const ASSET_STATUSES = [
  "in_storage",
  "checked_out",
  "in_transit",
  "awaiting_collection",
  "reserved",
] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export function getAssetStatusLabel(status: AssetStatus): string {
  return ASSET_STATUS_LABELS[status] ?? status;
}

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  in_storage: "In Storage",
  checked_out: "Checked Out",
  in_transit: "In Transit",
  awaiting_collection: "Awaiting Collection",
  reserved: "Reserved",
};

export const MOVEMENT_EVENT_TYPES = [
  "check-in",
  "check-out",
  "transfer",
] as const;
export type MovementEventType = (typeof MOVEMENT_EVENT_TYPES)[number];

export const MOVEMENT_EVENT_LABELS: Record<MovementEventType, string> = {
  "check-in": "Check-In",
  "check-out": "Check-Out",
  transfer: "Transfer",
};

export function getMovementEventLabel(type: MovementEventType): string {
  return MOVEMENT_EVENT_LABELS[type] ?? type;
}

export type ReportType = "check-in" | "check-out" | "periodic" | "service";

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  "check-in": "Check-In",
  "check-out": "Check-Out",
  periodic: "Periodic Inspection",
  service: "Service",
};

export function getReportTypeLabel(type: ReportType): string {
  return REPORT_TYPE_LABELS[type] || type;
}

export const SERVICE_TYPES = [
  "cleaning",
  "maintenance",
  "valeting",
  "MOT",
  "tyre change",
  "battery care",
  "custom",
] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number] | string;

export const VEHICLE_TYPES = [
  "petrol",
  "diesel",
  "hybrid",
  "electric",
] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];

type VehicleLevelDef = {
  key: string;
  label: string;
  for: VehicleType[];
};

export const VEHICLE_LEVELS: VehicleLevelDef[] = [
  { key: "fuel", label: "Fuel", for: ["petrol", "diesel", "hybrid"] },
  {
    key: "batteryCharge",
    label: "Battery charge",
    for: ["electric", "hybrid"],
  },
  {
    key: "engineOil",
    label: "Engine oil",
    for: ["petrol", "diesel", "hybrid"],
  },
  {
    key: "coolant",
    label: "Coolant",
    for: ["petrol", "diesel", "hybrid", "electric"],
  },
  {
    key: "batteryCoolant",
    label: "Battery coolant",
    for: ["electric", "hybrid"],
  },
  {
    key: "brakeFluid",
    label: "Brake fluid",
    for: ["petrol", "diesel", "hybrid", "electric"],
  },
  {
    key: "powerSteeringFluid",
    label: "Power steering fluid",
    for: ["petrol", "diesel", "hybrid", "electric"],
  },
  {
    key: "windscreenWasher",
    label: "Windscreen washer",
    for: ["petrol", "diesel", "hybrid", "electric"],
  },
  { key: "reductionGearOil", label: "Reduction gear oil", for: ["electric"] },
];

export type VehicleLevelType = (typeof VEHICLE_LEVELS)[number]["key"];

export type VehicleLevels = Partial<Record<VehicleLevelType, number | null>>;

// --- Types ---

export type WithLabel<T> = T & { label?: string };

export type WithOrganisation = { clerkOrganisationId: string };

// Add a base type for timestamps and soft-deletes
type Timestamps = {
  createdAt?: string; // ISO date string
  updatedAt?: string; // ISO date string
  deletedAt?: string; // ISO date string, undefined/null if not deleted
};

// -- Location --
export type LocationZone = {
  id: string;
  locationId: string;
  name: string;
  label: string;
  floor?: string | null;
  sortOrder?: number;
};

export type LocationDetails = WithLabel<{
  id: string;
  name: string;
  zones: LocationZone[];
  address?: string;
  phone?: string;
  contactName?: string;
  notes?: string;
}> &
  Timestamps &
  WithOrganisation;

// -- Client --
export type Client = WithLabel<{
  id: string;
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
  createdByUserId: string;
  notes?: string;
  referenceNumber?: string;
  customFields?: Record<string, string | number | boolean>;
}> &
  Timestamps &
  WithOrganisation;

export type DashboardClient = Pick<
  Client,
  "id" | "firstName" | "lastName" | "createdAt"
> & {
  vehicleCount?: number;
  overdueAmount?: number;
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

  // Omit: id, label, created_by_user_id, clerk_organisation_id,
  // created_at, updated_at, deleted_at – these are defaults/derived.
};

// -- User --
export type UserRole = "admin" | "manager" | "staff";

export type User = WithLabel<{
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  assignedLocationIds?: string[];
}> &
  Timestamps &
  WithOrganisation;

// -- Asset --
export type Asset = WithLabel<{
  id: string;
  clientId: string;
  locationId?: string;
  vinNumber?: string;
  identifier: string; // reg no, VIN, barcode, SKU, etc.
  assetType: AssetType;
  vehicleType?: VehicleType;
  make?: string;
  model?: string;
  colour?: string;
  year?: number;
  storageSlot?: string;
  notes?: string;
  createdByUserId: string;
  status?: AssetStatus;
  barcode?: string;
  rfidTag?: string;
  quantity?: number;
  customFields?: Record<string, string | number | boolean>;
}> &
  Timestamps &
  WithOrganisation;

export type AssetWithStatus = Asset & {
  isCheckedIn: boolean;
  lastEventType?: "check-in" | "check-out" | "transfer" | null;
  lastMovementTime?: string | null;
};

export type VehicleListItem = {
  id: string;
  clientId: string;
  identifier: string | null;
  make: string | null;
  model: string | null;
  colour: string | null;
  year: number | null;
  lastEventType: "check-in" | "check-out" | "transfer" | null;
  lastMovementTime: string | null;
  isCheckedIn: boolean;
};

// -- DamagedPart --
export type DamagedPart = {
  part: CarPart;
  notes?: string;
  imageStoragePath?: string;
};

// sides
export const SIDES = [
  "front",
  "nearside",
  "back",
  "offside",
  "interior",
] as const;

export type Side = (typeof SIDES)[number];

export type Observation = {
  id: string; // needed by the annotator (stable marker id in UI)
  markerId?: string;
  x: number;
  y: number;
  note: string;
  photos: UploadedImage[];
};

// one side
export type SidePhoto = {
  side: Side;
  image: UploadedImage | null;
  observations: Observation[];
};

// -- ConditionReport --
export type ConditionReport = WithLabel<{
  id: string;
  assetId: string;
  reportType: ReportType;
  odometer?: number;
  // overallStatus: ConditionStatus;
  damagedParts?: DamagedPart[]; // Store as JSONB in DB
  vehicleLevels?: VehicleLevels; // Store as JSONB in DB
  notes?: string;
  inspectorId: string;
  photoUrls?: string[];
}> &
  Timestamps &
  WithOrganisation;

export type ConditionReportSubmit = {
  assetId: string;
  odometer?: number;
  notes?: string;

  // per-side base photo
  sides: Record<
    Side,
    {
      imagePath: string; // storage path for the side’s base image
      observations: Array<{
        x: number;
        y: number;
        note: string;
        photoPaths: string[]; // storage paths for detail photos
      }>;
    } | null // side missing
  >;

  // optional other metrics you already collect:
  vehicleLevels?: Record<string, number | null>;
};

// -- MovementEvent --
export type MovementEvent = {
  id: string;
  assetId: string;
  eventType: MovementEventType;

  // DB columns are nullable, model them as | null (not undefined)
  fromLocationId: string | null;
  fromLocationZoneId: string | null;
  toLocationId: string | null;
  toLocationZoneId: string | null;

  createdByUserId: string;
  conditionReportId: string | null;

  notes: string | null;
  quantityMoved: number | null;
  storageDetails: Record<string, unknown> | null;
} & Timestamps &
  WithOrganisation;

export type MovementInsertInput = Omit<
  MovementEvent,
  | "id"
  | "createdByUserId"
  | "clerkOrganisationId"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
>;

export type StorageCover =
  | "storage-supplied"
  | "customer-supplied"
  | "not-required"
  | "";
export type TrickleCharger =
  | "storage-supplied"
  | "customer-supplied"
  | "not-required"
  | "";
export type Valeting = "required" | "not-requested";

export const STORAGE_COVER_LABELS: Record<StorageCover, string> = {
  "storage-supplied": "Storage supplied",
  "customer-supplied": "Customer supplied",
  "not-required": "Not required",
  "": "—",
};

export const TRICKLE_CHARGER_LABELS: Record<TrickleCharger, string> = {
  "storage-supplied": "Storage supplied",
  "customer-supplied": "Customer supplied",
  "not-required": "Not required",
  "": "—",
};

export const VALETING_LABELS: Record<Valeting, string> = {
  required: "Required",
  "not-requested": "Not requested",
};

export function labelForStorageCover(v: StorageCover): string {
  return STORAGE_COVER_LABELS[v] ?? v;
}
export function labelForTrickleCharger(v: TrickleCharger): string {
  return TRICKLE_CHARGER_LABELS[v] ?? v;
}
export function labelForValeting(v: Valeting): string {
  return VALETING_LABELS[v] ?? v;
}

export type MovementState = {
  locationId: string | null;
  locationZoneId: string | null;
  notes: string;
  tagNumber: string;
  cover: StorageCover;
  charger: TrickleCharger;
  valeting: Valeting;
  motRequired: boolean;
  motDate: string | null; // ISO yyyy-mm-dd
  serviceRequired: boolean;
  serviceDate: string | null; // ISO yyyy-mm-dd
};

// -- ServiceOrder --
export type ServiceOrder = {
  id: string;
  assetId: string;
  serviceType: ServiceType;
  description: string;
  date: string; // ISO
  performedBy: string;
  notes?: string;
  cost?: number;
  invoiceId?: string;
  status?: "requested" | "in_progress" | "completed" | "cancelled";
} & Timestamps &
  WithOrganisation;

// -- Invoice --
export type Invoice = {
  id: string;
  clientId: string;
  assetIds: string[];
  serviceOrderIds?: string[];
  movementEventIds?: string[];
  dateIssued: string;
  dueDate?: string;
  createdBy: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  lineItems: {
    description: string;
    amount: number;
    quantity: number;
    vat?: number;
    serviceOrderId?: string;
    movementEventId?: string;
  }[];
  notes?: string;
  total: number;
  paidAmount?: number;
  pdfUrl?: string;
  customFields?: Record<string, string | number | boolean>;
} & Timestamps &
  WithOrganisation;

// -- FileAttachment --
export type FileAttachment = WithLabel<{
  id: string;
  assetId: string;
  conditionReportId?: string;
  fileUrl: string;
  fileType: string;
  uploadedBy: string;
  uploadedAt: string;
}> &
  Timestamps &
  WithOrganisation;

// -- ReleaseReport --
export type ChecklistItem = {
  key: string;
  label: string;
  checked?: boolean;
  notes?: string;
};

export type PhotoSet = {
  front?: string;
  back?: string;
  left?: string;
  right?: string;
};

export type ReleaseReport = WithLabel<{
  id: string;
  assetId: string;
  conditionReportId?: string; // can be null
  releasedBy: string; // user id
  releasedAt: string; // ISO string
  recipientName: string;
  odometer?: number;
  photoUrls?: string[];
  releasePhotos?: PhotoSet;
  notes?: string;
  checklist?: ChecklistItem[];
}> &
  Timestamps &
  WithOrganisation;

export const CHECKOUT_CHECKLIST: ChecklistItem[] = [
  { key: "id_checked", label: "Recipient's ID checked" },
  { key: "final_inspection", label: "Final vehicle inspection" },
  { key: "documents_provided", label: "Relevant documents provided" },
  { key: "keys_handed_over", label: "Keys handed over" },
];

export type PhotoSlot = { key: string; label: string };
export const PHOTO_SLOTS: PhotoSlot[] = [
  { key: "front", label: "Front" },
  { key: "back", label: "Back" },
  { key: "side_left", label: "Left Side" },
  { key: "side_right", label: "Right Side" },
];

export type DamagedPartDraft = Omit<DamagedPart, "photoUrl"> & {
  photoFile?: File;
  notes?: string;
};

export type ConditionReportDraft = Partial<
  Omit<ConditionReport, "id" | "assetId">
> & {
  /** draft id if created server-side */
  id?: string;
  /** asset may be unknown locally for a moment */
  assetId?: string | null;

  /** UI-only fields */
  updatedAt?: string | null;
  sidePhotoIdBySide?: Partial<Record<Side, string>>;
  sidesUi?: SidePhoto[];
  damagedParts?: DamagedPartDraft[];
  context?: {
    latestSubmittedReportId?: string | null;
  };
};

export type RecentCheckIn = {
  assetId?: string;
  identifier: string;
  make: string;
  model: string;
  colour?: string;
  year?: number;
  client?: string;
  currentLocationId?: string;
  lastCheckinTime?: string; // ISO date string
  lastMovementId?: string;
};

export type LatestAssetEvent = {
  assetId: string;
  lastEventId: string;
  lastEventType: "check-in" | "check-out" | "transfer";
  lastMovementTime: string; // ISO
  identifier: string | null;
  make: string | null;
  model: string | null;
  colour: string | null;
  year: number | null;
  clientId: string | null;
  client: string; // "Unknown client" fallback already set by SQL
};

export type LocationStorageStatus = {
  locationId: string;
  name: string;
  label?: string;
  capacity: number;
  occupied: number;
  spacesAvailable: number;
};

export type Organisation = {
  id: string;
  name: string;
  address?: string;
  contactEmail?: string;
  phone?: string;
} & Timestamps;

// Input for the “add client” form / insert action
export type ClientInput = Omit<
  Client,
  "id" | "clerkOrganisationId" | "createdAt" | "updatedAt" | "createdByUserId" // ← omit this (filled by DB default)
> & {
  id?: string; // temp id for client-side drafts
};

// All fields are optional except for those you want required in the form
export type AssetInput = {
  id?: string;
  clientId?: string;
  identifier: string;
  vinNumber?: string; // optional VIN number
  assetType: AssetType;
  vehicleType?: VehicleType;
  status?: AssetStatus;
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

export type UploadFn = (
  file: File,
  side: Side,
  scope: "side" | "detail",
) => Promise<
  | {
      status: "success";
      path: string;
      /** present when scope === "side" */
      sidePhotoId?: string;
    }
  | { status: "error"; error: string }
>;

export type UploadedImage = {
  file?: File;
  previewUrl?: string;
  uploadStatus?: "uploading" | "success" | "error";
  errorMessage?: string;
  progress?: number;
  imageStoragePath?: string; // for side photos
  markerPhotoStoragePath?: string; // for marker photos
};

// prep types
// lib/types/prep.ts

// Raw (as stored / fetched)
export type ServiceOptionRaw = string | { value: string; label: string };

// Normalised (what the UI renders)
export type ServiceOption = { value: string; label: string };

type BaseService = {
  id: string;
  service_key: string;
  label: string;
};

export type BooleanService = BaseService & {
  input_type: "boolean";
  options: null;
};
export type TextService = BaseService & { input_type: "text"; options: null };
export type NumberService = BaseService & {
  input_type: "number";
  options: null;
};
export type DateService = BaseService & { input_type: "date"; options: null };

// For selects, keep RAW union in the type so callers can pass either strings or {value,label}
export type SelectService = BaseService & {
  input_type: "select";
  options: ReadonlyArray<ServiceOptionRaw>;
};

export type MultiselectService = BaseService & {
  input_type: "multiselect";
  options: ReadonlyArray<ServiceOptionRaw>;
};

export type ServiceRow =
  | BooleanService
  | SelectService
  | MultiselectService
  | TextService
  | NumberService
  | DateService;

export type ServiceValue = boolean | string | number | string[] | "";
