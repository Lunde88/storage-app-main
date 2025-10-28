// "use client";

// import { useState } from "react";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Separator } from "@/components/ui/separator";
// import { Plus, Trash2, GripVertical, Pencil, Save, X } from "lucide-react";

// import {
//   createLocation,
//   updateLocation,
//   deleteLocation,
//   createZone,
//   updateZone,
//   deleteZone,
//   reorderZones,
//   type LocationInput,
// } from "@/lib/actions/locationActions";

// /* ---------- Types ---------- */

// type Zone = { id: string; name: string; sort_order?: number | null };
// type LocationRow = {
//   id: string;
//   name: string;
//   label?: string | null;
//   address?: string | null;
//   phone?: string | null;
//   contact_name?: string | null;
//   notes?: string | null;
//   capacity?: number | null;
//   location_zones?: Zone[];
// };

// /* ---------- Component ---------- */

// export default function LocationsManager({
//   initialData,
// }: {
//   initialData: LocationRow[];
// }) {
//   const [rows, setRows] = useState<LocationRow[]>(initialData);

//   // UI state for creating a new location
//   const [creating, setCreating] = useState(false);
//   const [createDraft, setCreateDraft] = useState<LocationInput>({
//     name: "",
//     label: "",
//     address: "",
//     phone: "",
//     contactName: "",
//     notes: "",
//     capacity: 0,
//   });

//   // Per-location edit mode + draft
//   const [editingId, setEditingId] = useState<string | null>(null);
//   const [draft, setDraft] = useState<Record<string, LocationInput>>({}); // keyed by location id
//   const [saving, setSaving] = useState(false);

//   // Per-location zone manage mode + draft array
//   const [managingZonesFor, setManagingZonesFor] = useState<string | null>(null);
//   const [zonesDraft, setZonesDraft] = useState<Record<string, Zone[]>>({}); // keyed by location id
//   const [savingZones, setSavingZones] = useState(false);

//   /* ---------- Helpers ---------- */

//   const startEdit = (loc: LocationRow) => {
//     setEditingId(loc.id);
//     setDraft((d) => ({
//       ...d,
//       [loc.id]: {
//         name: loc.name ?? "",
//         label: loc.label ?? "",
//         address: loc.address ?? "",
//         phone: loc.phone ?? "",
//         contactName: loc.contact_name ?? "",
//         notes: loc.notes ?? "",
//         capacity: loc.capacity ?? 0,
//       },
//     }));
//   };

//   const cancelEdit = (locId: string) => {
//     setEditingId((prev) => (prev === locId ? null : prev));
//     setDraft((d) => {
//       const next = { ...d };
//       delete next[locId];
//       return next;
//     });
//   };

//   const onDraftChange = <K extends keyof LocationInput>(
//     locId: string,
//     key: K,
//     value: LocationInput[K],
//   ) =>
//     setDraft((d) => ({
//       ...d,
//       [locId]: { ...(d[locId] ?? {}), [key]: value },
//     }));

//   /* ---------- Location CRUD ---------- */

//   const handleCreate = async () => {
//     if (!createDraft.name.trim()) return;
//     setSaving(true);
//     try {
//       const created = await createLocation({
//         ...createDraft,
//         label: createDraft.label?.trim() || createDraft.name.trim(),
//         capacity:
//           typeof createDraft.capacity === "number" ? createDraft.capacity : 0,
//       });
//       setRows((r) => [...r, { ...created, location_zones: [] }]);
//       // reset
//       setCreateDraft({
//         name: "",
//         label: "",
//         address: "",
//         phone: "",
//         contactName: "",
//         notes: "",
//         capacity: 0,
//       });
//       setCreating(false);
//     } finally {
//       setSaving(false);
//     }
//   };

//   const handleSaveLocation = async (locId: string) => {
//     const d = draft[locId];
//     if (!d) return;
//     setSaving(true);
//     try {
//       const updated = await updateLocation(locId, {
//         ...d,
//         label: d.label?.trim() || d.name.trim(),
//         capacity: typeof d.capacity === "number" ? d.capacity : 0,
//       });
//       setRows((r) => r.map((x) => (x.id === locId ? { ...x, ...updated } : x)));
//       cancelEdit(locId);
//     } finally {
//       setSaving(false);
//     }
//   };

//   const handleDeleteLocation = async (locId: string) => {
//     if (
//       !confirm(
//         "Delete this location? Vehicles remain in history; the location is soft-deleted.",
//       )
//     )
//       return;
//     setSaving(true);
//     try {
//       await deleteLocation(locId);
//       setRows((r) => r.filter((x) => x.id !== locId));
//       cancelEdit(locId);
//       if (managingZonesFor === locId) {
//         setManagingZonesFor(null);
//       }
//     } finally {
//       setSaving(false);
//     }
//   };

//   /* ---------- Zones manage mode ---------- */

//   const startManageZones = (loc: LocationRow) => {
//     setManagingZonesFor(loc.id);
//     setZonesDraft((z) => ({
//       ...z,
//       [loc.id]: [...(loc.location_zones ?? [])],
//     }));
//   };

//   const cancelManageZones = (locId: string) => {
//     setManagingZonesFor((prev) => (prev === locId ? null : prev));
//     setZonesDraft((z) => {
//       const next = { ...z };
//       delete next[locId];
//       return next;
//     });
//   };

//   const addZoneRow = (locId: string) => {
//     setZonesDraft((z) => {
//       const next = [...(z[locId] ?? [])];
//       next.push({
//         id: `temp-${crypto.randomUUID()}`,
//         name: "New sub-location",
//       });
//       return { ...z, [locId]: next };
//     });
//   };

//   const renameZoneRow = (locId: string, zoneId: string, name: string) => {
//     setZonesDraft((z) => {
//       const arr = [...(z[locId] ?? [])];
//       const idx = arr.findIndex((x) => x.id === zoneId);
//       if (idx >= 0) arr[idx] = { ...arr[idx], name };
//       return { ...z, [locId]: arr };
//     });
//   };

//   const deleteZoneRow = (locId: string, zoneId: string) => {
//     setZonesDraft((z) => {
//       const arr = [...(z[locId] ?? [])].filter((x) => x.id !== zoneId);
//       return { ...z, [locId]: arr };
//     });
//   };

//   const moveZoneRow = (locId: string, index: number, dir: -1 | 1) => {
//     setZonesDraft((z) => {
//       const arr = [...(z[locId] ?? [])];
//       const swap = index + dir;
//       if (swap < 0 || swap >= arr.length) return z;
//       [arr[index], arr[swap]] = [arr[swap], arr[index]];
//       return { ...z, [locId]: arr };
//     });
//   };

//   const handleSaveZones = async (loc: LocationRow) => {
//     const original = loc.location_zones ?? [];
//     const edited = zonesDraft[loc.id] ?? [];

//     setSavingZones(true);
//     try {
//       // 1) Deletes for zones removed
//       const deleted = original.filter(
//         (o) => !edited.some((e) => e.id === o.id),
//       );
//       for (const dz of deleted) {
//         await deleteZone(dz.id);
//       }

//       // 2) Creates for temp zones
//       const idMap = new Map<string, string>(); // tempId -> realId
//       for (const ez of edited) {
//         if (ez.id.startsWith("temp-")) {
//           const created = await createZone(loc.id, ez.name.trim());
//           idMap.set(ez.id, created.id);
//         }
//       }

//       // 3) Updates for renamed existing zones
//       for (const ez of edited) {
//         if (!ez.id.startsWith("temp-")) {
//           const match = original.find((o) => o.id === ez.id);
//           if (match && match.name !== ez.name) {
//             await updateZone(ez.id, ez.name.trim());
//           }
//         }
//       }

//       // 4) Reorder final list (translate temp ids to real)
//       const finalIds = edited.map((z) => idMap.get(z.id) ?? z.id);
//       await reorderZones(loc.id, finalIds);

//       // Refresh local rows
//       const finalZones: Zone[] = edited.map((z, i) => ({
//         id: idMap.get(z.id) ?? z.id,
//         name: z.name,
//         sort_order: i + 1,
//       }));

//       setRows((r) =>
//         r.map((x) =>
//           x.id === loc.id ? { ...x, location_zones: finalZones } : x,
//         ),
//       );

//       cancelManageZones(loc.id);
//     } finally {
//       setSavingZones(false);
//     }
//   };

//   /* ---------- UI ---------- */

//   return (
//     <div className="space-y-5">
//       <div className="flex items-center justify-between">
//         <h2 className="text-xl font-semibold">Locations & Sub-locations</h2>
//         {!creating ? (
//           <Button onClick={() => setCreating(true)}>
//             <Plus className="mr-2 h-4 w-4" />
//             Add location
//           </Button>
//         ) : (
//           <div className="flex items-end gap-2">
//             <div className="grid grid-cols-2 gap-3">
//               <Field
//                 label="Name"
//                 value={createDraft.name}
//                 onChange={(v) =>
//                   setCreateDraft((d) => ({ ...d, name: v ?? "" }))
//                 }
//               />
//               <Field
//                 label="Label"
//                 value={createDraft.label ?? ""}
//                 onChange={(v) =>
//                   setCreateDraft((d) => ({ ...d, label: v ?? "" }))
//                 }
//               />
//               <Field
//                 label="Address"
//                 value={createDraft.address ?? ""}
//                 onChange={(v) =>
//                   setCreateDraft((d) => ({ ...d, address: v ?? "" }))
//                 }
//               />
//               <Field
//                 label="Contact name"
//                 value={createDraft.contactName ?? ""}
//                 onChange={(v) =>
//                   setCreateDraft((d) => ({ ...d, contactName: v ?? "" }))
//                 }
//               />
//               <Field
//                 label="Phone"
//                 value={createDraft.phone ?? ""}
//                 onChange={(v) =>
//                   setCreateDraft((d) => ({ ...d, phone: v ?? "" }))
//                 }
//               />
//               <Field
//                 label="Capacity"
//                 type="number"
//                 value={String(createDraft.capacity ?? 0)}
//                 onChange={(v) =>
//                   setCreateDraft((d) => ({
//                     ...d,
//                     capacity: Number(v) || 0,
//                   }))
//                 }
//               />
//             </div>
//             <Button
//               onClick={handleCreate}
//               disabled={saving || !createDraft.name.trim()}
//             >
//               <Save className="mr-2 h-4 w-4" />
//               Save
//             </Button>
//             <Button
//               variant="outline"
//               onClick={() => {
//                 setCreating(false);
//                 setCreateDraft({
//                   name: "",
//                   label: "",
//                   address: "",
//                   phone: "",
//                   contactName: "",
//                   notes: "",
//                   capacity: 0,
//                 });
//               }}
//               disabled={saving}
//             >
//               <X className="mr-2 h-4 w-4" />
//               Cancel
//             </Button>
//           </div>
//         )}
//       </div>

//       {rows.length === 0 ? (
//         <Card>
//           <CardContent className="text-muted-foreground py-10 text-center text-sm">
//             No locations yet. Add your first location.
//           </CardContent>
//         </Card>
//       ) : (
//         rows.map((loc) => {
//           const isEditing = editingId === loc.id;
//           const d = draft[loc.id];
//           const zoneManaging = managingZonesFor === loc.id;
//           const zones = loc.location_zones ?? [];
//           const localZones = zonesDraft[loc.id] ?? [];

//           return (
//             <Card key={loc.id} className="overflow-hidden">
//               <CardContent className="p-4">
//                 {/* Header actions */}
//                 <div className="mb-3 flex items-center justify-between">
//                   <div className="text-sm font-semibold">
//                     {isEditing ? d?.name || "(unnamed)" : loc.name}
//                   </div>
//                   {!isEditing ? (
//                     <div className="flex items-center gap-2">
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => startEdit(loc)}
//                       >
//                         <Pencil className="mr-2 h-4 w-4" />
//                         Edit
//                       </Button>
//                       <Button
//                         variant="destructive"
//                         size="sm"
//                         onClick={() => handleDeleteLocation(loc.id)}
//                       >
//                         <Trash2 className="mr-2 h-4 w-4" />
//                         Delete
//                       </Button>
//                     </div>
//                   ) : (
//                     <div className="flex items-center gap-2">
//                       <Button
//                         size="sm"
//                         onClick={() => handleSaveLocation(loc.id)}
//                         disabled={saving}
//                       >
//                         <Save className="mr-2 h-4 w-4" />
//                         Save
//                       </Button>
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => cancelEdit(loc.id)}
//                         disabled={saving}
//                       >
//                         <X className="mr-2 h-4 w-4" />
//                         Cancel
//                       </Button>
//                     </div>
//                   )}
//                 </div>

//                 {/* Body */}
//                 {!isEditing ? (
//                   <div className="grid gap-3 md:grid-cols-2">
//                     <ReadRow label="Label" value={loc.label} />
//                     <ReadRow label="Address" value={loc.address} />
//                     <ReadRow label="Contact name" value={loc.contact_name} />
//                     <ReadRow label="Phone" value={loc.phone} />
//                     <ReadRow
//                       label="Capacity"
//                       value={
//                         typeof loc.capacity === "number"
//                           ? String(loc.capacity)
//                           : ""
//                       }
//                     />
//                     <ReadRow label="Notes" value={loc.notes} full />
//                   </div>
//                 ) : (
//                   <div className="grid gap-3 md:grid-cols-2">
//                     <Field
//                       label="Name"
//                       value={d?.name ?? ""}
//                       onChange={(v) => onDraftChange(loc.id, "name", v)}
//                       disabled={saving}
//                     />
//                     <Field
//                       label="Label"
//                       value={d?.label ?? ""}
//                       onChange={(v) => onDraftChange(loc.id, "label", v)}
//                       disabled={saving}
//                     />
//                     <Field
//                       label="Address"
//                       value={d?.address ?? ""}
//                       onChange={(v) => onDraftChange(loc.id, "address", v)}
//                       disabled={saving}
//                     />
//                     <Field
//                       label="Contact name"
//                       value={d?.contactName ?? ""}
//                       onChange={(v) => onDraftChange(loc.id, "contactName", v)}
//                       disabled={saving}
//                     />
//                     <Field
//                       label="Phone"
//                       value={d?.phone ?? ""}
//                       onChange={(v) => onDraftChange(loc.id, "phone", v)}
//                       disabled={saving}
//                     />
//                     <Field
//                       label="Capacity"
//                       type="number"
//                       value={String(d?.capacity ?? 0)}
//                       onChange={(v) =>
//                         onDraftChange(loc.id, "capacity", Number(v) || 0)
//                       }
//                       disabled={saving}
//                     />
//                     <Field
//                       label="Notes"
//                       value={d?.notes ?? ""}
//                       onChange={(v) => onDraftChange(loc.id, "notes", v)}
//                       disabled={saving}
//                     />
//                   </div>
//                 )}

//                 <Separator className="my-4" />
//                 <div className="mb-2 flex items-center justify-between">
//                   <h3 className="text-sm font-medium">Sub-locations</h3>
//                   {!zoneManaging ? (
//                     <Button
//                       variant="outline"
//                       size="sm"
//                       onClick={() => startManageZones(loc)}
//                       disabled={savingZones}
//                     >
//                       <Pencil className="mr-2 h-4 w-4" />
//                       Manage
//                     </Button>
//                   ) : (
//                     <div className="flex items-center gap-2">
//                       <Button
//                         size="sm"
//                         onClick={() => handleSaveZones(loc)}
//                         disabled={savingZones}
//                       >
//                         <Save className="mr-2 h-4 w-4" />
//                         Save changes
//                       </Button>
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => cancelManageZones(loc.id)}
//                         disabled={savingZones}
//                       >
//                         <X className="mr-2 h-4 w-4" />
//                         Cancel
//                       </Button>
//                     </div>
//                   )}
//                 </div>

//                 {!zoneManaging ? (
//                   zones.length === 0 ? (
//                     <div className="text-muted-foreground text-sm">
//                       No sub-locations.
//                     </div>
//                   ) : (
//                     <ul className="text-muted-foreground text-sm leading-7">
//                       {zones.map((z) => (
//                         <li key={z.id}>• {z.name}</li>
//                       ))}
//                     </ul>
//                   )
//                 ) : (
//                   <div className="space-y-2">
//                     {localZones.length === 0 ? (
//                       <div className="text-muted-foreground text-sm">
//                         No sub-locations.
//                       </div>
//                     ) : (
//                       <ul className="divide-y rounded border">
//                         {localZones.map((z, idx) => (
//                           <li
//                             key={z.id}
//                             className="flex items-center gap-2 p-2"
//                           >
//                             <GripVertical className="h-4 w-4 opacity-50" />
//                             <Input
//                               value={z.name}
//                               onChange={(e) =>
//                                 renameZoneRow(loc.id, z.id, e.target.value)
//                               }
//                               className="flex-1"
//                             />
//                             <div className="flex items-center gap-1">
//                               <Button
//                                 variant="outline"
//                                 size="icon"
//                                 onClick={() => moveZoneRow(loc.id, idx, -1)}
//                                 disabled={idx === 0}
//                                 title="Move up"
//                               >
//                                 ↑
//                               </Button>
//                               <Button
//                                 variant="outline"
//                                 size="icon"
//                                 onClick={() => moveZoneRow(loc.id, idx, +1)}
//                                 disabled={idx === localZones.length - 1}
//                                 title="Move down"
//                               >
//                                 ↓
//                               </Button>
//                               <Button
//                                 variant="destructive"
//                                 size="icon"
//                                 onClick={() => deleteZoneRow(loc.id, z.id)}
//                                 title="Delete"
//                               >
//                                 <Trash2 className="h-4 w-4" />
//                               </Button>
//                             </div>
//                           </li>
//                         ))}
//                       </ul>
//                     )}
//                     <Button
//                       variant="secondary"
//                       onClick={() => addZoneRow(loc.id)}
//                     >
//                       <Plus className="mr-2 h-4 w-4" />
//                       Add sub-location
//                     </Button>
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           );
//         })
//       )}
//     </div>
//   );
// }

// /* ---------- Small presentational helpers ---------- */

// function Field({
//   label,
//   value,
//   onChange,
//   type = "text",
//   disabled,
// }: {
//   label: string;
//   value: string;
//   onChange: (v: string) => void;
//   type?: "text" | "number";
//   disabled?: boolean;
// }) {
//   return (
//     <div className="space-y-1">
//       <Label className="text-muted-foreground text-xs tracking-wide uppercase">
//         {label}
//       </Label>
//       <Input
//         type={type}
//         value={value}
//         onChange={(e) => onChange(e.target.value)}
//         disabled={disabled}
//       />
//     </div>
//   );
// }

// function ReadRow({
//   label,
//   value,
//   full,
// }: {
//   label: string;
//   value?: string | null;
//   full?: boolean;
// }) {
//   return (
//     <div className={full ? "md:col-span-2" : ""}>
//       <Label className="text-muted-foreground text-xs tracking-wide uppercase">
//         {label}
//       </Label>
//       <div className="mt-1 text-sm">
//         {value ? value : <span className="text-muted-foreground">—</span>}
//       </div>
//     </div>
//   );
// }

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  GripVertical,
  Pencil,
  Save,
  X,
  Building2,
  Phone,
  User,
  MapPin,
  Hash,
  Layers3,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import {
  createLocation,
  updateLocation,
  deleteLocation,
  createZone,
  updateZone,
  deleteZone,
  reorderZones,
  type LocationInput,
} from "@/lib/actions/locationActions";

/* ---------- Types ---------- */

type Zone = { id: string; name: string; sort_order?: number | null };
type LocationRow = {
  id: string;
  name: string;
  label?: string | null;
  address?: string | null;
  phone?: string | null;
  contact_name?: string | null;
  notes?: string | null;
  capacity?: number | null;
  location_zones?: Zone[];
};

/* ---------- Component ---------- */

export default function LocationsManager({
  initialData,
}: {
  initialData: LocationRow[];
}) {
  const [rows, setRows] = useState<LocationRow[]>(initialData);

  // UI state for creating a new location
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState<LocationInput>({
    name: "",
    label: "",
    address: "",
    phone: "",
    contactName: "",
    notes: "",
    capacity: 0,
  });

  // Per-location edit mode + draft
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, LocationInput>>({}); // keyed by location id
  const [saving, setSaving] = useState(false);

  // Per-location zone manage mode + draft array
  const [managingZonesFor, setManagingZonesFor] = useState<string | null>(null);
  const [zonesDraft, setZonesDraft] = useState<Record<string, Zone[]>>({}); // keyed by location id
  const [savingZones, setSavingZones] = useState(false);

  /* ---------- Helpers ---------- */

  const startEdit = (loc: LocationRow) => {
    setEditingId(loc.id);
    setDraft((d) => ({
      ...d,
      [loc.id]: {
        name: loc.name ?? "",
        label: loc.label ?? "",
        address: loc.address ?? "",
        phone: loc.phone ?? "",
        contactName: loc.contact_name ?? "",
        notes: loc.notes ?? "",
        capacity: loc.capacity ?? 0,
      },
    }));
  };

  const cancelEdit = (locId: string) => {
    setEditingId((prev) => (prev === locId ? null : prev));
    setDraft((d) => {
      const next = { ...d };
      delete next[locId];
      return next;
    });
  };

  const onDraftChange = <K extends keyof LocationInput>(
    locId: string,
    key: K,
    value: LocationInput[K],
  ) =>
    setDraft((d) => ({
      ...d,
      [locId]: { ...(d[locId] ?? {}), [key]: value },
    }));

  /* ---------- Location CRUD ---------- */

  const handleCreate = async () => {
    if (!createDraft.name.trim()) return;
    setSaving(true);
    try {
      const created = await createLocation({
        ...createDraft,
        label: createDraft.label?.trim() || createDraft.name.trim(),
        capacity:
          typeof createDraft.capacity === "number" ? createDraft.capacity : 0,
      });
      setRows((r) => [...r, { ...created, location_zones: [] }]);
      // reset
      setCreateDraft({
        name: "",
        label: "",
        address: "",
        phone: "",
        contactName: "",
        notes: "",
        capacity: 0,
      });
      setCreating(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLocation = async (locId: string) => {
    const d = draft[locId];
    if (!d) return;
    setSaving(true);
    try {
      const updated = await updateLocation(locId, {
        ...d,
        label: d.label?.trim() || d.name.trim(),
        capacity: typeof d.capacity === "number" ? d.capacity : 0,
      });
      setRows((r) => r.map((x) => (x.id === locId ? { ...x, ...updated } : x)));
      cancelEdit(locId);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLocation = async (locId: string) => {
    if (
      !confirm(
        "Delete this location? Vehicles remain in history; the location is soft-deleted.",
      )
    )
      return;
    setSaving(true);
    try {
      await deleteLocation(locId);
      setRows((r) => r.filter((x) => x.id !== locId));
      cancelEdit(locId);
      if (managingZonesFor === locId) {
        setManagingZonesFor(null);
      }
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Zones manage mode ---------- */

  const startManageZones = (loc: LocationRow) => {
    setManagingZonesFor(loc.id);
    setZonesDraft((z) => ({
      ...z,
      [loc.id]: [...(loc.location_zones ?? [])],
    }));
  };

  const cancelManageZones = (locId: string) => {
    setManagingZonesFor((prev) => (prev === locId ? null : prev));
    setZonesDraft((z) => {
      const next = { ...z };
      delete next[locId];
      return next;
    });
  };

  const addZoneRow = (locId: string) => {
    setZonesDraft((z) => {
      const next = [...(z[locId] ?? [])];
      next.push({
        id: `temp-${crypto.randomUUID()}`,
        name: "New sub-location",
      });
      return { ...z, [locId]: next };
    });
  };

  const renameZoneRow = (locId: string, zoneId: string, name: string) => {
    setZonesDraft((z) => {
      const arr = [...(z[locId] ?? [])];
      const idx = arr.findIndex((x) => x.id === zoneId);
      if (idx >= 0) arr[idx] = { ...arr[idx], name };
      return { ...z, [locId]: arr };
    });
  };

  const deleteZoneRow = (locId: string, zoneId: string) => {
    setZonesDraft((z) => {
      const arr = [...(z[locId] ?? [])].filter((x) => x.id !== zoneId);
      return { ...z, [locId]: arr };
    });
  };

  const moveZoneRow = (locId: string, index: number, dir: -1 | 1) => {
    setZonesDraft((z) => {
      const arr = [...(z[locId] ?? [])];
      const swap = index + dir;
      if (swap < 0 || swap >= arr.length) return z;
      [arr[index], arr[swap]] = [arr[swap], arr[index]];
      return { ...z, [locId]: arr };
    });
  };

  const handleSaveZones = async (loc: LocationRow) => {
    const original = loc.location_zones ?? [];
    const edited = zonesDraft[loc.id] ?? [];

    setSavingZones(true);
    try {
      // 1) Deletes for zones removed
      const deleted = original.filter(
        (o) => !edited.some((e) => e.id === o.id),
      );
      for (const dz of deleted) {
        await deleteZone(dz.id);
      }

      // 2) Creates for temp zones
      const idMap = new Map<string, string>(); // tempId -> realId
      for (const ez of edited) {
        if (ez.id.startsWith("temp-")) {
          const created = await createZone(loc.id, ez.name.trim());
          idMap.set(ez.id, created.id);
        }
      }

      // 3) Updates for renamed existing zones
      for (const ez of edited) {
        if (!ez.id.startsWith("temp-")) {
          const match = original.find((o) => o.id === ez.id);
          if (match && match.name !== ez.name) {
            await updateZone(ez.id, ez.name.trim());
          }
        }
      }

      // 4) Reorder final list (translate temp ids to real)
      const finalIds = edited.map((z) => idMap.get(z.id) ?? z.id);
      await reorderZones(loc.id, finalIds);

      // Refresh local rows
      const finalZones: Zone[] = edited.map((z, i) => ({
        id: idMap.get(z.id) ?? z.id,
        name: z.name,
        sort_order: i + 1,
      }));

      setRows((r) =>
        r.map((x) =>
          x.id === loc.id ? { ...x, location_zones: finalZones } : x,
        ),
      );

      cancelManageZones(loc.id);
    } finally {
      setSavingZones(false);
    }
  };

  /* ---------- UI ---------- */

  return (
    <div className="space-y-5">
      {/* Header / Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Locations & Sub-locations</h2>
          <p className="text-muted-foreground text-sm">
            Create locations, add optional details, then organise sub-locations
            (zones).
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add location
        </Button>
      </div>

      {/* Empty state */}
      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <div className="bg-muted mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full">
              <Building2 className="text-muted-foreground h-5 w-5" />
            </div>
            <p className="text-muted-foreground text-sm">
              No locations yet. Click{" "}
              <span className="font-medium">Add location</span> to create your
              first one.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rows.map((loc) => {
            const isEditing = editingId === loc.id;
            const d = draft[loc.id];
            const zoneManaging = managingZonesFor === loc.id;
            const zones = loc.location_zones ?? [];
            const localZones = zonesDraft[loc.id] ?? [];

            return (
              <Card key={loc.id} className="overflow-hidden">
                <CardContent className="p-4">
                  {/* Header row */}
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold">
                        {isEditing ? d?.name || "(unnamed)" : loc.name}
                      </div>
                      <Badge variant="secondary" className="rounded-full">
                        <Layers3 className="mr-1 h-3.5 w-3.5" />
                        {zones.length} zones
                      </Badge>
                    </div>

                    {!isEditing ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(loc)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startManageZones(loc)}
                          disabled={savingZones}
                        >
                          <Layers3 className="mr-2 h-4 w-4" />
                          Manage zones
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteLocation(loc.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    ) : (
                      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 flex w-full items-center justify-end gap-2 rounded-md border p-2 backdrop-blur">
                        <Button
                          size="sm"
                          onClick={() => handleSaveLocation(loc.id)}
                          disabled={saving}
                        >
                          <Save className="mr-2 h-4 w-4" />
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cancelEdit(loc.id)}
                          disabled={saving}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Read vs Edit body */}
                  {!isEditing ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <ReadRow label="Label" value={loc.label} />
                      <ReadRow label="Address" value={loc.address} />
                      <ReadRow label="Contact name" value={loc.contact_name} />
                      <ReadRow label="Phone" value={loc.phone} />
                      <ReadRow
                        label="Capacity"
                        value={
                          typeof loc.capacity === "number"
                            ? String(loc.capacity)
                            : ""
                        }
                      />
                      <ReadRow label="Notes" value={loc.notes} full />
                    </div>
                  ) : (
                    <div className="grid gap-6">
                      {/* Group 1: Identity */}
                      <Section title="Identity">
                        <div className="grid gap-3 md:grid-cols-2">
                          <Field
                            label="Name"
                            icon={<Building2 className="h-4 w-4" />}
                            placeholder="Main Warehouse"
                            value={d?.name ?? ""}
                            onChange={(v) => onDraftChange(loc.id, "name", v)}
                            disabled={saving}
                          />
                          <Field
                            label="Label"
                            placeholder="What drivers see (optional)"
                            value={d?.label ?? ""}
                            onChange={(v) => onDraftChange(loc.id, "label", v)}
                            disabled={saving}
                          />
                        </div>
                      </Section>

                      {/* Group 2: Contact & Address */}
                      <Section title="Contact & address">
                        <div className="grid gap-3 md:grid-cols-2">
                          <Field
                            label="Address"
                            icon={<MapPin className="h-4 w-4" />}
                            placeholder="Street, City, Postcode"
                            value={d?.address ?? ""}
                            onChange={(v) =>
                              onDraftChange(loc.id, "address", v)
                            }
                            disabled={saving}
                          />
                          <Field
                            label="Contact name"
                            icon={<User className="h-4 w-4" />}
                            placeholder="On-site contact"
                            value={d?.contactName ?? ""}
                            onChange={(v) =>
                              onDraftChange(loc.id, "contactName", v)
                            }
                            disabled={saving}
                          />
                          <Field
                            label="Phone"
                            icon={<Phone className="h-4 w-4" />}
                            placeholder="+44…"
                            value={d?.phone ?? ""}
                            onChange={(v) => onDraftChange(loc.id, "phone", v)}
                            disabled={saving}
                          />
                          <Field
                            label="Capacity"
                            icon={<Hash className="h-4 w-4" />}
                            type="number"
                            placeholder="0"
                            value={String(d?.capacity ?? 0)}
                            onChange={(v) =>
                              onDraftChange(loc.id, "capacity", Number(v) || 0)
                            }
                            disabled={saving}
                          />
                        </div>
                      </Section>

                      {/* Group 3: Notes */}
                      <Section title="Notes">
                        <Field
                          label="Notes"
                          placeholder="Access codes, loading bay info, restrictions…"
                          value={d?.notes ?? ""}
                          onChange={(v) => onDraftChange(loc.id, "notes", v)}
                          disabled={saving}
                        />
                      </Section>
                    </div>
                  )}

                  {/* Zones preview (read mode only) */}
                  {!isEditing && (
                    <>
                      <Separator className="my-4" />
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">Sub-locations</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startManageZones(loc)}
                          disabled={savingZones}
                        >
                          <Layers3 className="mr-2 h-4 w-4" />
                          Manage zones
                        </Button>
                      </div>

                      {zones.length === 0 ? (
                        <div className="text-muted-foreground mt-2 text-sm">
                          No sub-locations.
                        </div>
                      ) : (
                        <ul className="text-muted-foreground mt-2 text-sm leading-7">
                          {zones.map((z) => (
                            <li key={z.id}>• {z.name}</li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}

                  {/* Zones dialog (uses existing state/logic) */}
                  <Dialog
                    open={zoneManaging}
                    onOpenChange={(o) => !o && cancelManageZones(loc.id)}
                  >
                    <DialogContent className="sm:max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Manage sub-locations</DialogTitle>
                        <DialogDescription>
                          Reorder, rename, add or remove sub-locations for{" "}
                          <span className="font-medium">{loc.name}</span>.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-3">
                        {localZones.length === 0 ? (
                          <div className="text-muted-foreground text-sm">
                            No sub-locations yet.
                          </div>
                        ) : (
                          <ul className="divide-y rounded-md border">
                            {localZones.map((z, idx) => (
                              <li
                                key={z.id}
                                className="flex items-center gap-2 p-2"
                              >
                                <div className="bg-muted text-muted-foreground rounded-md border px-2 py-1 text-xs">
                                  <GripVertical className="h-4 w-4" />
                                </div>
                                <Input
                                  value={z.name}
                                  onChange={(e) =>
                                    renameZoneRow(loc.id, z.id, e.target.value)
                                  }
                                  className="flex-1"
                                  placeholder="Zone name"
                                />
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => moveZoneRow(loc.id, idx, -1)}
                                    disabled={idx === 0}
                                    title="Move up"
                                  >
                                    <ChevronUp className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => moveZoneRow(loc.id, idx, +1)}
                                    disabled={idx === localZones.length - 1}
                                    title="Move down"
                                  >
                                    <ChevronDown className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => deleteZoneRow(loc.id, z.id)}
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}

                        <div className="flex justify-between">
                          <Button
                            variant="secondary"
                            onClick={() => addZoneRow(loc.id)}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add sub-location
                          </Button>
                        </div>
                      </div>

                      <DialogFooter className="gap-2">
                        <Button
                          variant="outline"
                          onClick={() => cancelManageZones(loc.id)}
                          disabled={savingZones}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Cancel
                        </Button>
                        <Button
                          onClick={() => handleSaveZones(loc)}
                          disabled={savingZones}
                        >
                          <Save className="mr-2 h-4 w-4" />
                          Save changes
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Location dialog (uses your existing createDraft + handleCreate) */}
      <Dialog open={creating} onOpenChange={(o) => !o && setCreating(false)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add location</DialogTitle>
            <DialogDescription>
              Give your location a name and any optional details.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6">
            <Section title="Identity">
              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label="Name"
                  required
                  placeholder="Main Warehouse"
                  value={createDraft.name}
                  onChange={(v) =>
                    setCreateDraft((d) => ({ ...d, name: v ?? "" }))
                  }
                />
                <Field
                  label="Label"
                  placeholder="What drivers see (optional)"
                  value={createDraft.label ?? ""}
                  onChange={(v) =>
                    setCreateDraft((d) => ({ ...d, label: v ?? "" }))
                  }
                />
              </div>
            </Section>

            <Section title="Contact & address">
              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label="Address"
                  placeholder="Street, City, Postcode"
                  value={createDraft.address ?? ""}
                  onChange={(v) =>
                    setCreateDraft((d) => ({ ...d, address: v ?? "" }))
                  }
                />
                <Field
                  label="Contact name"
                  placeholder="On-site contact"
                  value={createDraft.contactName ?? ""}
                  onChange={(v) =>
                    setCreateDraft((d) => ({ ...d, contactName: v ?? "" }))
                  }
                />
                <Field
                  label="Phone"
                  placeholder="+44…"
                  value={createDraft.phone ?? ""}
                  onChange={(v) =>
                    setCreateDraft((d) => ({ ...d, phone: v ?? "" }))
                  }
                />
                <Field
                  label="Capacity"
                  type="number"
                  placeholder="0"
                  value={String(createDraft.capacity ?? 0)}
                  onChange={(v) =>
                    setCreateDraft((d) => ({
                      ...d,
                      capacity: Number(v) || 0,
                    }))
                  }
                />
              </div>
            </Section>

            <Section title="Notes">
              <Field
                label="Notes"
                placeholder="Access codes, delivery instructions, restrictions…"
                value={createDraft.notes ?? ""}
                onChange={(v) =>
                  setCreateDraft((d) => ({ ...d, notes: v ?? "" }))
                }
              />
            </Section>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCreating(false);
                setCreateDraft({
                  name: "",
                  label: "",
                  address: "",
                  phone: "",
                  contactName: "",
                  notes: "",
                  capacity: 0,
                });
              }}
              disabled={saving}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !createDraft.name.trim()}
            >
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Small presentational helpers ---------- */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">{title}</h4>
      <div>{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  disabled,
  placeholder,
  icon,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "number";
  disabled?: boolean;
  placeholder?: string;
  icon?: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground text-xs tracking-wide">
        <span className="uppercase">{label}</span>
        {required ? <span className="text-destructive ml-1">*</span> : null}
      </Label>
      <div className="relative">
        {icon ? (
          <div className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2">
            {icon}
          </div>
        ) : null}
        <Input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={icon ? "pl-8" : ""}
        />
      </div>
    </div>
  );
}

function ReadRow({
  label,
  value,
  full,
}: {
  label: string;
  value?: string | null;
  full?: boolean;
}) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <Label className="text-muted-foreground text-xs tracking-wide uppercase">
        {label}
      </Label>
      <div className="mt-1 text-sm">
        {value ? value : <span className="text-muted-foreground">—</span>}
      </div>
    </div>
  );
}
