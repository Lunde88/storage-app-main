// "use client";

// import { useMemo, useState } from "react";
// import { Button } from "@/components/ui/button";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Input } from "@/components/ui/input";
// import {
//   Select,
//   SelectTrigger,
//   SelectContent,
//   SelectItem,
//   SelectValue,
// } from "@/components/ui/select";
// import {
//   Command,
//   CommandEmpty,
//   CommandGroup,
//   CommandInput,
//   CommandItem,
// } from "@/components/ui/command";
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from "@/components/ui/popover";
// import { Switch } from "@/components/ui/switch";
// import { Checkbox } from "@/components/ui/checkbox";
// import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
// import { cn } from "@/lib/utils";
// import DatePicker from "@/components/base/DatePicker";
// import {
//   ServiceOption,
//   ServiceOptionRaw,
//   ServiceRow,
//   ServiceValue,
// } from "@/lib/types";

// type ClientRow = {
//   id: string;
//   first_name: string | null;
//   last_name: string | null;
//   company_name: string | null;
// };
// type AssetRow = {
//   id: string;
//   identifier: string | null;
//   client_id?: string | null;
//   client?: ClientRow | null;
// };
// type ZoneRow = { id: string; name: string | null; location_id: string };
// type LocationsWithZones = { id: string; name: string; zones: ZoneRow[] };
// type BookingType = "drop-off" | "pick-up" | "transfer";

// function normaliseOptions(o: ReadonlyArray<ServiceOptionRaw>): ServiceOption[] {
//   return o.map((x) => (typeof x === "string" ? { value: x, label: x } : x));
// }

// function nameOfClient(c: ClientRow): string {
//   const full = [c.first_name, c.last_name].filter(Boolean).join(" ");
//   return full || c.company_name || "(client)";
// }

// const TIME_OPTIONS_15 = (() => {
//   const opts: { value: string; label: string }[] = [];
//   for (let h = 0; h < 24; h++) {
//     for (let m = 0; m < 60; m += 15) {
//       const hh = String(h).padStart(2, "0");
//       const mm = String(m).padStart(2, "0");
//       opts.push({ value: `${hh}:${mm}`, label: `${hh}:${mm}` });
//     }
//   }
//   return opts;
// })();

// function combineDateAndTime(date: Date | null, hhmm: string | ""): Date | null {
//   if (!date || !hhmm) return null;
//   const [hh, mm] = hhmm.split(":").map((s) => parseInt(s, 10));
//   const d = new Date(date);
//   d.setHours(hh, mm, 0, 0);
//   return d;
// }

// export default function NewBookingForm({
//   assets,
//   clients,
//   locations,
//   services,
//   createAction,
// }: {
//   assets: AssetRow[];
//   clients: ClientRow[];
//   locations: LocationsWithZones[];
//   services: ServiceRow[]; // may be empty
//   createAction: (formData: FormData) => Promise<void>;
// }) {
//   const [assetId, setAssetId] = useState("");
//   const [clientId, setClientId] = useState("");
//   const [bookingType, setBookingType] = useState<BookingType>("drop-off");

//   const [startDate, setStartDate] = useState<Date | null>(null);
//   const [startTime, setStartTime] = useState<string>("");
//   const [endDate, setEndDate] = useState<Date | null>(null);
//   const [endTime, setEndTime] = useState<string>("");

//   const [toLocationId, setToLocationId] = useState("");
//   const [toZoneId, setToZoneId] = useState("");
//   const [fromLocationId, setFromLocationId] = useState("");
//   const [fromZoneId, setFromZoneId] = useState("");
//   const [notes, setNotes] = useState("");

//   // Fallback manual rows if no services provided
//   const [prepRows, setPrepRows] = useState<{ key: string; value: string }[]>(
//     [],
//   );

//   const toLocation = useMemo(
//     () => locations.find((l) => l.id === toLocationId) ?? null,
//     [locations, toLocationId],
//   );
//   const fromLocation = useMemo(
//     () => locations.find((l) => l.id === fromLocationId) ?? null,
//     [locations, fromLocationId],
//   );
//   const toZones = toLocation?.zones ?? [];
//   const fromZones = fromLocation?.zones ?? [];

//   const onChangeToLocation = (id: string) => {
//     setToLocationId(id);
//     const nextZones = locations.find((l) => l.id === id)?.zones ?? [];
//     if (!nextZones.some((z) => z.id === toZoneId)) setToZoneId("");
//   };
//   const onChangeFromLocation = (id: string) => {
//     setFromLocationId(id);
//     const nextZones = locations.find((l) => l.id === id)?.zones ?? [];
//     if (!nextZones.some((z) => z.id === fromZoneId)) setFromZoneId("");
//   };

//   const canSubmit =
//     !!assetId && !!clientId && !!bookingType && !!startDate && !!startTime;

//   const [serviceState, setServiceState] = useState<
//     Record<string, ServiceValue>
//   >({});
//   const setServiceValue = (key: string, value: ServiceValue) =>
//     setServiceState((prev) => ({ ...prev, [key]: value }));

//   // Build prep_requested from services OR fallback rows
//   const prepFromServices = services.reduce<Record<string, ServiceValue>>(
//     (acc, s) => {
//       const v = serviceState[s.service_key];
//       const keep =
//         v !== undefined &&
//         v !== null &&
//         !(Array.isArray(v) && v.length === 0) &&
//         v !== "";
//       if (keep) acc[s.service_key] = v;
//       return acc;
//     },
//     {},
//   );

//   const prepFromRows = prepRows.reduce<Record<string, string>>((acc, r) => {
//     if (r.key.trim() !== "") acc[r.key.trim()] = r.value;
//     return acc;
//   }, {});

//   const prepRequested = JSON.stringify(
//     services.length > 0 ? prepFromServices : prepFromRows,
//   );

//   const startAtIso =
//     combineDateAndTime(startDate, startTime)?.toISOString() ?? "";
//   const endAtIso = combineDateAndTime(endDate, endTime)?.toISOString() ?? "";

//   // ── service dynamic state

//   return (
//     <form action={createAction} className="grid gap-4 sm:grid-cols-2">
//       {/* Vehicle (combobox) */}
//       <div className="space-y-1.5 sm:col-span-2">
//         <Label>Vehicle</Label>
//         <Combobox
//           items={assets.map((a) => ({
//             value: a.id,
//             label: a.identifier?.toUpperCase() ?? a.id.slice(0, 8),
//           }))}
//           value={assetId}
//           onChange={setAssetId}
//           placeholder="Search vehicle…"
//           emptyText="No vehicles found."
//         />
//       </div>

//       {/* Client (combobox) */}
//       <div className="space-y-1.5 sm:col-span-2">
//         <Label>Client</Label>
//         <Combobox
//           items={clients.map((c) => ({ value: c.id, label: nameOfClient(c) }))}
//           value={clientId}
//           onChange={setClientId}
//           placeholder="Search client…"
//           emptyText="No clients found."
//         />
//       </div>

//       {/* Type */}
//       <div className="space-y-1.5">
//         <Label>Type</Label>
//         <Select
//           value={bookingType}
//           onValueChange={(v) => setBookingType(v as BookingType)}
//         >
//           <SelectTrigger className="w-full justify-between">
//             <SelectValue />
//           </SelectTrigger>
//           <SelectContent>
//             <SelectItem value="drop-off">Drop-off (Check-in)</SelectItem>
//             <SelectItem value="pick-up">Pick-up (Check-out)</SelectItem>
//             <SelectItem value="transfer">Transfer</SelectItem>
//           </SelectContent>
//         </Select>
//       </div>

//       {/* Start */}
//       <div className="space-y-1.5">
//         <Label>Start</Label>
//         <div className="grid grid-cols-2 gap-2">
//           <DatePicker
//             id="start-date"
//             value={startDate}
//             onChange={setStartDate}
//             allowClear={false}
//           />
//           <Select value={startTime} onValueChange={setStartTime}>
//             <SelectTrigger className="w-full justify-between">
//               <SelectValue placeholder="HH:MM" />
//             </SelectTrigger>
//             <SelectContent className="max-h-64">
//               {TIME_OPTIONS_15.map((t) => (
//                 <SelectItem key={t.value} value={t.value}>
//                   {t.label}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>
//       </div>

//       {/* End (optional) */}
//       <div className="space-y-1.5">
//         <Label>End (optional)</Label>
//         <div className="grid grid-cols-2 gap-2">
//           <DatePicker id="end-date" value={endDate} onChange={setEndDate} />
//           <Select value={endTime} onValueChange={setEndTime}>
//             <SelectTrigger className="w-full justify-between">
//               <SelectValue placeholder="HH:MM" />
//             </SelectTrigger>
//             <SelectContent className="max-h-64">
//               {TIME_OPTIONS_15.map((t) => (
//                 <SelectItem key={t.value} value={t.value}>
//                   {t.label}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>
//       </div>

//       {/* To */}
//       <div className="space-y-2 rounded-lg border p-3 sm:col-span-2">
//         <h4 className="text-sm font-semibold">To (planned)</h4>
//         <div className="grid gap-3 sm:grid-cols-2">
//           <div className="space-y-1.5">
//             <Label>Location</Label>
//             <div className="flex items-center gap-2">
//               <Select value={toLocationId} onValueChange={onChangeToLocation}>
//                 <SelectTrigger className="w-full justify-between">
//                   <SelectValue placeholder="—" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {locations.map((l) => (
//                     <SelectItem key={l.id} value={l.id}>
//                       {l.name}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//               {!!toLocationId && (
//                 <Button
//                   type="button"
//                   variant="ghost"
//                   size="sm"
//                   onClick={() => {
//                     setToLocationId("");
//                     setToZoneId("");
//                   }}
//                 >
//                   Clear
//                 </Button>
//               )}
//             </div>
//           </div>
//           {toLocationId && toZones.length > 0 && (
//             <div className="space-y-1.5">
//               <Label>Sub-location</Label>
//               <Select value={toZoneId} onValueChange={setToZoneId}>
//                 <SelectTrigger className="w-full justify-between">
//                   <SelectValue placeholder="Select sub-location" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {toZones.map((z) => (
//                     <SelectItem key={z.id} value={z.id}>
//                       {z.name}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* From */}
//       <div className="space-y-2 rounded-lg border p-3 sm:col-span-2">
//         <h4 className="text-sm font-semibold">From (planned)</h4>
//         <div className="grid gap-3 sm:grid-cols-2">
//           <div className="space-y-1.5">
//             <Label>Location</Label>
//             <div className="flex items-center gap-2">
//               <Select
//                 value={fromLocationId}
//                 onValueChange={onChangeFromLocation}
//               >
//                 <SelectTrigger className="w-full justify-between">
//                   <SelectValue placeholder="—" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {locations.map((l) => (
//                     <SelectItem key={l.id} value={l.id}>
//                       {l.name}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//               {!!fromLocationId && (
//                 <Button
//                   type="button"
//                   variant="ghost"
//                   size="sm"
//                   onClick={() => {
//                     setFromLocationId("");
//                     setFromZoneId("");
//                   }}
//                 >
//                   Clear
//                 </Button>
//               )}
//             </div>
//           </div>
//           {fromLocationId && fromZones.length > 0 && (
//             <div className="space-y-1.5">
//               <Label>Sub-location</Label>
//               <Select value={fromZoneId} onValueChange={setFromZoneId}>
//                 <SelectTrigger className="w-full justify-between">
//                   <SelectValue placeholder="Select sub-location" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {fromZones.map((z) => (
//                     <SelectItem key={z.id} value={z.id}>
//                       {z.name}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Prep requests */}
//       <div className="space-y-2 rounded-lg border p-3 sm:col-span-2">
//         <h4 className="text-sm font-semibold">Prep requests</h4>

//         {services.length > 0 ? (
//           <div className="grid gap-3">
//             {services.map((s) => (
//               <ServiceField
//                 key={s.id}
//                 svc={s}
//                 value={serviceState[s.service_key]}
//                 onChange={(v) => setServiceValue(s.service_key, v)}
//               />
//             ))}
//           </div>
//         ) : (
//           <div className="space-y-2">
//             {prepRows.length === 0 ? (
//               <p className="text-muted-foreground text-sm">
//                 No prep requests added.
//               </p>
//             ) : (
//               prepRows.map((row, idx) => (
//                 <div key={idx} className="grid grid-cols-[1fr,1fr,auto] gap-2">
//                   <Input
//                     placeholder="key (e.g. valeting)"
//                     value={row.key}
//                     onChange={(e) => {
//                       const next = [...prepRows];
//                       next[idx] = { ...row, key: e.target.value };
//                       setPrepRows(next);
//                     }}
//                   />
//                   <Input
//                     placeholder="value (e.g. required)"
//                     value={row.value}
//                     onChange={(e) => {
//                       const next = [...prepRows];
//                       next[idx] = { ...row, value: e.target.value };
//                       setPrepRows(next);
//                     }}
//                   />
//                   <Button
//                     type="button"
//                     variant="ghost"
//                     size="icon"
//                     onClick={() =>
//                       setPrepRows(prepRows.filter((_, i) => i !== idx))
//                     }
//                   >
//                     <Trash2 className="h-4 w-4" />
//                   </Button>
//                 </div>
//               ))
//             )}
//             <Button
//               type="button"
//               variant="outline"
//               size="sm"
//               onClick={() => setPrepRows([...prepRows, { key: "", value: "" }])}
//               className="mt-1"
//             >
//               <Plus className="mr-2 h-4 w-4" />
//               Add prep row
//             </Button>
//           </div>
//         )}
//       </div>

//       {/* Notes */}
//       <div className="space-y-1.5 sm:col-span-2">
//         <Label>Notes</Label>
//         <Textarea
//           rows={2}
//           value={notes}
//           onChange={(e) => setNotes(e.target.value)}
//         />
//       </div>

//       {/* Hidden fields → server action */}
//       <input type="hidden" name="assetId" value={assetId} />
//       <input type="hidden" name="clientId" value={clientId} />
//       <input type="hidden" name="bookingType" value={bookingType} />
//       <input type="hidden" name="startAt" value={startAtIso} />
//       <input type="hidden" name="endAt" value={endAtIso} />
//       <input type="hidden" name="toLocationId" value={toLocationId} />
//       <input type="hidden" name="toZoneId" value={toZoneId} />
//       <input type="hidden" name="fromLocationId" value={fromLocationId} />
//       <input type="hidden" name="fromZoneId" value={fromZoneId} />
//       <input type="hidden" name="prepRequested" value={prepRequested} />
//       <input type="hidden" name="notes" value={notes} />

//       <div className="sm:col-span-2">
//         <Button type="submit" disabled={!canSubmit}>
//           Create booking
//         </Button>
//       </div>
//     </form>
//   );
// }

// /* ────────────────────────────── */
// /* Dynamic service field renderer */
// /* ────────────────────────────── */
// function ServiceField({
//   svc,
//   value,
//   onChange,
// }: {
//   svc: ServiceRow;
//   value: ServiceValue | undefined;
//   onChange: (v: ServiceValue) => void;
// }) {
//   if (svc.input_type === "boolean") {
//     return (
//       <div className="flex items-center justify-between">
//         <Label className="mr-4">{svc.label}</Label>
//         <Switch checked={!!value} onCheckedChange={(c) => onChange(!!c)} />
//       </div>
//     );
//   }

//   if (svc.input_type === "select") {
//     const opts = normaliseOptions(svc.options);
//     return (
//       <div className="space-y-1.5">
//         <Label>{svc.label}</Label>
//         <Select
//           value={(value as string) ?? ""}
//           onValueChange={(v) => onChange(v)}
//         >
//           <SelectTrigger className="w-full justify-between">
//             <SelectValue placeholder="Select…" />
//           </SelectTrigger>
//           <SelectContent>
//             {opts.map((o) => (
//               <SelectItem key={o.value} value={o.value}>
//                 {o.label}
//               </SelectItem>
//             ))}
//           </SelectContent>
//         </Select>
//       </div>
//     );
//   }

//   if (svc.input_type === "multiselect") {
//     const opts = normaliseOptions(svc.options);
//     const arr = Array.isArray(value) ? (value as string[]) : [];
//     const toggle = (v: string) =>
//       onChange(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

//     return (
//       <div className="space-y-1.5">
//         <Label>{svc.label}</Label>
//         <div className="grid gap-2 sm:grid-cols-2">
//           {opts.map((o) => (
//             <label
//               key={o.value}
//               className="flex items-center gap-2 rounded border p-2"
//             >
//               <Checkbox
//                 checked={arr.includes(o.value)}
//                 onCheckedChange={() => toggle(o.value)}
//               />
//               <span className="text-sm">{o.label}</span>
//             </label>
//           ))}
//         </div>
//       </div>
//     );
//   }

//   if (svc.input_type === "number") {
//     // only allow number | string("") for the input
//     const display: string | number =
//       typeof value === "number"
//         ? value
//         : typeof value === "string"
//           ? value
//           : "";

//     return (
//       <div className="space-y-1.5">
//         <Label>{svc.label}</Label>
//         <Input
//           type="number"
//           value={display}
//           onChange={(e) => {
//             const next = e.target.value;
//             onChange(next === "" ? "" : Number(next));
//           }}
//         />
//       </div>
//     );
//   }

//   if (svc.input_type === "date") {
//     return (
//       <div className="space-y-1.5">
//         <Label>{svc.label}</Label>
//         <DatePicker
//           id={`svc-${svc.service_key}`}
//           value={value ? new Date(String(value)) : null}
//           onChange={(d) => onChange(d ? d.toISOString().slice(0, 10) : "")}
//           allowClear
//         />
//       </div>
//     );
//   }

//   // text
//   const textDisplay: string = typeof value === "string" ? value : "";

//   return (
//     <div className="space-y-1.5">
//       <Label>{svc.label}</Label>
//       <Input value={textDisplay} onChange={(e) => onChange(e.target.value)} />
//     </div>
//   );
// }

// /* ────────────────────────────── */
// /* Reusable shadcn Combobox       */
// /* ────────────────────────────── */
// function Combobox({
//   items,
//   value,
//   onChange,
//   placeholder,
//   emptyText,
// }: {
//   items: { value: string; label: string }[];
//   value: string;
//   onChange: (v: string) => void;
//   placeholder?: string;
//   emptyText?: string;
// }) {
//   const [open, setOpen] = useState(false);
//   const selected = items.find((i) => i.value === value)?.label ?? "";
//   return (
//     <Popover open={open} onOpenChange={setOpen}>
//       <PopoverTrigger asChild>
//         <Button
//           type="button"
//           variant="outline"
//           role="combobox"
//           aria-expanded={open}
//           className="w-full justify-between"
//         >
//           {selected || (
//             <span className="text-muted-foreground">
//               {placeholder ?? "Select…"}
//             </span>
//           )}
//           <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
//         </Button>
//       </PopoverTrigger>
//       <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
//         <Command>
//           <CommandInput placeholder={placeholder ?? "Search…"} />
//           <CommandEmpty>{emptyText ?? "No results."}</CommandEmpty>
//           <CommandGroup className="max-h-64 overflow-auto">
//             {items.map((item) => (
//               <CommandItem
//                 key={item.value}
//                 value={item.label}
//                 onSelect={() => {
//                   onChange(item.value);
//                   setOpen(false);
//                 }}
//               >
//                 <Check
//                   className={cn(
//                     "mr-2 h-4 w-4",
//                     value === item.value ? "opacity-100" : "opacity-0",
//                   )}
//                 />
//                 {item.label}
//               </CommandItem>
//             ))}
//           </CommandGroup>
//         </Command>
//       </PopoverContent>
//     </Popover>
//   );
// }

"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertTriangle,
  Car,
  Check,
  ChevronsUpDown,
  Loader2,
  Trash2,
} from "lucide-react";

import DatePicker from "@/components/base/DatePicker";
import {
  ServiceOption,
  ServiceOptionRaw,
  ServiceRow,
  ServiceValue,
} from "@/lib/types";

/* ========================
   Types (no `any`)
======================== */
type ClientRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
};

type AssetRow = {
  id: string;
  identifier: string | null;
  make?: string | null;
  model?: string | null;
  client_id?: string | null;
  client?: ClientRow | null;
};

type ZoneRow = { id: string; name: string | null; location_id: string };
type LocationsWithZones = { id: string; name: string; zones: ZoneRow[] };
type BookingType = "drop-off" | "pick-up" | "transfer";

/* Search endpoint payload */
type SearchVehicleResult = {
  id: string; // asset id
  identifier: string;
  make: string | null;
  model: string | null;
  client: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
  } | null;
};
type SearchResponse = { vehicles: SearchVehicleResult[] };

/* ========================
   Small helpers
======================== */
function normaliseOptions(o: ReadonlyArray<ServiceOptionRaw>): ServiceOption[] {
  return o.map((x) => (typeof x === "string" ? { value: x, label: x } : x));
}

function nameOfClient(c: ClientRow): string {
  const full = [c.first_name, c.last_name].filter(Boolean).join(" ");
  return full || c.company_name || "(client)";
}

const TIME_OPTIONS_15 = (() => {
  const opts: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      opts.push({ value: `${hh}:${mm}`, label: `${hh}:${mm}` });
    }
  }
  return opts;
})();

function combineDateAndTime(date: Date | null, hhmm: string | ""): Date | null {
  if (!date || !hhmm) return null;
  const [hh, mm] = hhmm.split(":").map((s) => parseInt(s, 10));
  const d = new Date(date);
  d.setHours(hh, mm, 0, 0);
  return d;
}

/* ========================
   Main Form
======================== */
export default function NewBookingForm({
  assets,
  clients,
  locations,
  services,
  createAction,
  searchEndpoint = "/api/search",
}: {
  assets: AssetRow[];
  clients: ClientRow[];
  locations: LocationsWithZones[];
  services: ServiceRow[];
  createAction: (formData: FormData) => Promise<void>;
  /** GET endpoint returning { vehicles: SearchVehicleResult[] } */
  searchEndpoint?: string;
}) {
  const formRef = React.useRef<HTMLFormElement>(null);

  const [assetId, setAssetId] = useState("");
  const [clientId, setClientId] = useState("");
  const [bookingType, setBookingType] = useState<BookingType>("drop-off");

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<string>("");
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<string>("");

  const [toLocationId, setToLocationId] = useState("");
  const [toZoneId, setToZoneId] = useState("");
  const [fromLocationId, setFromLocationId] = useState("");
  const [fromZoneId, setFromZoneId] = useState("");
  const [notes, setNotes] = useState("");

  // dynamic services state
  const [serviceState, setServiceState] = useState<
    Record<string, ServiceValue>
  >({});
  const setServiceValue = (key: string, value: ServiceValue) =>
    setServiceState((prev) => ({ ...prev, [key]: value }));

  // fallback manual rows if no services configured
  const [prepRows, setPrepRows] = useState<{ key: string; value: string }[]>(
    [],
  );

  const toLocation = useMemo(
    () => locations.find((l) => l.id === toLocationId) ?? null,
    [locations, toLocationId],
  );
  const fromLocation = useMemo(
    () => locations.find((l) => l.id === fromLocationId) ?? null,
    [locations, fromLocationId],
  );
  const toZones = toLocation?.zones ?? [];
  const fromZones = fromLocation?.zones ?? [];

  const onChangeToLocation = (id: string) => {
    setToLocationId(id);
    const nextZones = locations.find((l) => l.id === id)?.zones ?? [];
    if (!nextZones.some((z) => z.id === toZoneId)) setToZoneId("");
  };
  const onChangeFromLocation = (id: string) => {
    setFromLocationId(id);
    const nextZones = locations.find((l) => l.id === id)?.zones ?? [];
    if (!nextZones.some((z) => z.id === fromZoneId)) setFromZoneId("");
  };

  // If user already has assets+clients in memory, resolve client from selected asset for display
  const resolvedClient: ClientRow | null = useMemo(() => {
    if (!assetId) return null;
    const localAsset =
      assets.find((a) => a.id === assetId) ??
      null; /* not used to set clientId; selection sets clientId explicitly */
    const linked =
      localAsset?.client ??
      (localAsset?.client_id
        ? (clients.find((c) => c.id === localAsset.client_id) ?? null)
        : null);
    return linked ?? null;
  }, [assetId, assets, clients]);

  const canSubmit =
    !!assetId && !!clientId && !!bookingType && !!startDate && !!startTime;

  // Build prep_requested (services first, else manual rows)
  const prepFromServices = services.reduce<Record<string, ServiceValue>>(
    (acc, s) => {
      const v = serviceState[s.service_key];
      const keep =
        v !== undefined &&
        v !== null &&
        !(Array.isArray(v) && v.length === 0) &&
        v !== "";
      if (keep) acc[s.service_key] = v;
      return acc;
    },
    {},
  );
  const prepFromRows = prepRows.reduce<Record<string, string>>((acc, r) => {
    if (r.key.trim() !== "") acc[r.key.trim()] = r.value;
    return acc;
  }, {});
  const prepRequested = JSON.stringify(
    services.length > 0 ? prepFromServices : prepFromRows,
  );

  const startAtIso =
    combineDateAndTime(startDate, startTime)?.toISOString() ?? "";
  const endAtIso = combineDateAndTime(endDate, endTime)?.toISOString() ?? "";

  const handleSubmit = async (fd: FormData) => {
    await createAction(fd); // calls your server action

    // clear local state
    setAssetId("");
    setClientId("");
    setBookingType("drop-off");
    setStartDate(null);
    setStartTime("");
    setEndDate(null);
    setEndTime("");
    setToLocationId("");
    setToZoneId("");
    setFromLocationId("");
    setFromZoneId("");
    setNotes("");
    setServiceState({});
    setPrepRows([]);

    // clear any uncontrolled browser state
    formRef.current?.reset();
  };

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="grid gap-4 sm:grid-cols-2"
    >
      {/* Vehicle + Client (single remote search) */}
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Vehicle</Label>
        <VehicleClientSearch
          endpoint={searchEndpoint}
          onSelect={(v) => {
            setAssetId(v.id);
            setClientId(v.client?.id ?? "");
          }}
        />

        {/* Selected client feedback */}
        <div className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
          {!assetId ? (
            <span>Search a vehicle to auto-fill the client.</span>
          ) : clientId ? (
            <span>
              Client:{" "}
              <strong>
                {resolvedClient
                  ? nameOfClient(resolvedClient)
                  : "Linked client selected"}
              </strong>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              No client linked to this vehicle
            </span>
          )}
        </div>
      </div>

      {/* Type */}
      <div className="space-y-1.5">
        <Label>Type</Label>
        <Select
          value={bookingType}
          onValueChange={(v) => {
            // cast keeps type-safe union
            setBookingType(v as BookingType);
          }}
        >
          <SelectTrigger className="w-full justify-between">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="drop-off">Drop-off (Check-in)</SelectItem>
            <SelectItem value="pick-up">Pick-up (Check-out)</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Start */}
      <div className="space-y-1.5">
        <Label>Start</Label>
        <div className="grid grid-cols-2 gap-2">
          <DatePicker
            id="start-date"
            value={startDate}
            onChange={setStartDate}
            allowClear={false}
          />
          <Select value={startTime} onValueChange={setStartTime}>
            <SelectTrigger className="w-full justify-between">
              <SelectValue placeholder="HH:MM" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {TIME_OPTIONS_15.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* End (optional) */}
      <div className="space-y-1.5">
        <Label>End (optional)</Label>
        <div className="grid grid-cols-2 gap-2">
          <DatePicker id="end-date" value={endDate} onChange={setEndDate} />
          <Select value={endTime} onValueChange={setEndTime}>
            <SelectTrigger className="w-full justify-between">
              <SelectValue placeholder="HH:MM" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {TIME_OPTIONS_15.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* To */}
      <div className="space-y-2 rounded-lg border p-3 sm:col-span-2">
        <h4 className="text-sm font-semibold">To (planned)</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Location</Label>
            <div className="flex items-center gap-2">
              <Select value={toLocationId} onValueChange={onChangeToLocation}>
                <SelectTrigger className="w-full justify-between">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!!toLocationId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setToLocationId("");
                    setToZoneId("");
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
          {toLocationId && toZones.length > 0 && (
            <div className="space-y-1.5">
              <Label>Sub-location</Label>
              <Select value={toZoneId} onValueChange={setToZoneId}>
                <SelectTrigger className="w-full justify-between">
                  <SelectValue placeholder="Select sub-location" />
                </SelectTrigger>
                <SelectContent>
                  {toZones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      {z.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* From */}
      <div className="space-y-2 rounded-lg border p-3 sm:col-span-2">
        <h4 className="text-sm font-semibold">From (planned)</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Location</Label>
            <div className="flex items-center gap-2">
              <Select
                value={fromLocationId}
                onValueChange={onChangeFromLocation}
              >
                <SelectTrigger className="w-full justify-between">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!!fromLocationId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFromLocationId("");
                    setFromZoneId("");
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
          {fromLocationId && fromZones.length > 0 && (
            <div className="space-y-1.5">
              <Label>Sub-location</Label>
              <Select value={fromZoneId} onValueChange={setFromZoneId}>
                <SelectTrigger className="w-full justify-between">
                  <SelectValue placeholder="Select sub-location" />
                </SelectTrigger>
                <SelectContent>
                  {fromZones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      {z.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Prep requests */}
      <div className="space-y-2 rounded-lg border p-3 sm:col-span-2">
        <h4 className="text-sm font-semibold">Prep requests</h4>

        {services.length > 0 ? (
          <div className="grid gap-3">
            {services.map((s) => (
              <ServiceField
                key={s.id}
                svc={s}
                value={serviceState[s.service_key]}
                onChange={(v) => setServiceValue(s.service_key, v)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {prepRows.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No prep requests added.
              </p>
            ) : (
              prepRows.map((row, idx) => (
                <div key={idx} className="grid grid-cols-[1fr,1fr,auto] gap-2">
                  <Input
                    placeholder="key (e.g. valeting)"
                    value={row.key}
                    onChange={(e) => {
                      const next = [...prepRows];
                      next[idx] = { ...row, key: e.target.value };
                      setPrepRows(next);
                    }}
                  />
                  <Input
                    placeholder="value (e.g. required)"
                    value={row.value}
                    onChange={(e) => {
                      const next = [...prepRows];
                      next[idx] = { ...row, value: e.target.value };
                      setPrepRows(next);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setPrepRows(prepRows.filter((_, i) => i !== idx))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPrepRows([...prepRows, { key: "", value: "" }])}
              className="mt-1"
            >
              Add prep row
            </Button>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Notes</Label>
        <Textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Hidden fields → server action */}
      <input type="hidden" name="assetId" value={assetId} />
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="bookingType" value={bookingType} />
      <input type="hidden" name="startAt" value={startAtIso} />
      <input type="hidden" name="endAt" value={endAtIso} />
      <input type="hidden" name="toLocationId" value={toLocationId} />
      <input type="hidden" name="toZoneId" value={toZoneId} />
      <input type="hidden" name="fromLocationId" value={fromLocationId} />
      <input type="hidden" name="fromZoneId" value={fromZoneId} />
      <input type="hidden" name="prepRequested" value={prepRequested} />
      <input type="hidden" name="notes" value={notes} />

      <div className="sm:col-span-2">
        <Button type="submit" disabled={!canSubmit}>
          Create booking
        </Button>
      </div>
    </form>
  );
}

/* ========================
   Vehicle/Client Search
   (remote, sets both IDs)
======================== */
function VehicleClientSearch({
  endpoint,
  onSelect,
}: {
  endpoint: string;
  onSelect: (v: SearchVehicleResult) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SearchResponse>({ vehicles: [] });

  React.useEffect(() => {
    const handle = setTimeout(async () => {
      const query = q.trim();
      if (query.length < 2) {
        setData({ vehicles: [] });
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`${endpoint}?q=${encodeURIComponent(query)}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Search failed");
        const json = (await res.json()) as SearchResponse;
        setData(json);
      } catch {
        setData({ vehicles: [] });
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [q, endpoint]);

  const selectedLabel = ""; // button shows placeholder until picked; selection happens in the list

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          onClick={() => setOpen((o) => !o)}
        >
          {selectedLabel || (
            <span className="text-muted-foreground">
              Search vehicles or clients…
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] p-0"
      >
        <Command shouldFilter={false}>
          <div className="relative">
            <CommandInput
              placeholder="Search vehicles or clients…"
              value={q}
              onValueChange={setQ}
            />
            {loading && (
              <span className="text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </span>
            )}
          </div>
          <CommandList>
            {!loading && data.vehicles.length === 0 && (
              <CommandEmpty>No results.</CommandEmpty>
            )}

            {data.vehicles.length > 0 && (
              <CommandGroup heading="Vehicles">
                {data.vehicles.map((v) => {
                  const clientLabel = v.client
                    ? nameOfClient(v.client)
                    : "(no client)";
                  return (
                    <CommandItem
                      key={v.id}
                      // Let cmdk keep its own filtering if user keeps typing; we fetch server-side, so keep `value` simple.
                      value={`${v.identifier} ${v.make ?? ""} ${v.model ?? ""} ${clientLabel}`}
                      onSelect={() => {
                        onSelect(v);
                        setOpen(false);
                        setQ("");
                      }}
                    >
                      <Car className="mr-2 h-4 w-4" />
                      <span className="font-medium">
                        {v.identifier.toUpperCase()}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        {(v.make ?? "").trim()} {(v.model ?? "").trim()}
                      </span>
                      <CommandSeparator />
                      <span className="text-muted-foreground ml-2">
                        {clientLabel}
                      </span>
                      <Check className="ml-auto h-4 w-4 opacity-0" />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* ========================
   Dynamic service fields
======================== */
function ServiceField({
  svc,
  value,
  onChange,
}: {
  svc: ServiceRow;
  value: ServiceValue | undefined;
  onChange: (v: ServiceValue) => void;
}) {
  if (svc.input_type === "boolean") {
    return (
      <div className="flex items-center justify-between">
        <Label className="mr-4">{svc.label}</Label>
        <Switch checked={!!value} onCheckedChange={(c) => onChange(!!c)} />
      </div>
    );
  }

  if (svc.input_type === "select") {
    const opts = normaliseOptions(svc.options);
    return (
      <div className="space-y-1.5">
        <Label>{svc.label}</Label>
        <Select
          value={(value as string) ?? ""}
          onValueChange={(v) => onChange(v)}
        >
          <SelectTrigger className="w-full justify-between">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {opts.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (svc.input_type === "multiselect") {
    const opts = normaliseOptions(svc.options);
    const arr = Array.isArray(value) ? (value as string[]) : [];
    const toggle = (v: string) =>
      onChange(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

    return (
      <div className="space-y-1.5">
        <Label>{svc.label}</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {opts.map((o) => (
            <label
              key={o.value}
              className="flex items-center gap-2 rounded border p-2"
            >
              <Checkbox
                checked={arr.includes(o.value)}
                onCheckedChange={() => toggle(o.value)}
              />
              <span className="text-sm">{o.label}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (svc.input_type === "number") {
    const display: string | number =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? value
          : "";
    return (
      <div className="space-y-1.5">
        <Label>{svc.label}</Label>
        <Input
          type="number"
          value={display}
          onChange={(e) => {
            const next = e.target.value;
            onChange(next === "" ? "" : Number(next));
          }}
        />
      </div>
    );
  }

  if (svc.input_type === "date") {
    return (
      <div className="space-y-1.5">
        <Label>{svc.label}</Label>
        <DatePicker
          id={`svc-${svc.service_key}`}
          value={value ? new Date(String(value)) : null}
          onChange={(d) => onChange(d ? d.toISOString().slice(0, 10) : "")}
          allowClear
        />
      </div>
    );
  }

  const textDisplay: string = typeof value === "string" ? value : "";
  return (
    <div className="space-y-1.5">
      <Label>{svc.label}</Label>
      <Input value={textDisplay} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
