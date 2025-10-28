// "use client";

// import { useMemo, useState } from "react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Calendar } from "@/components/ui/calendar"; // ensure this file has "use client"
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from "@/components/ui/popover";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { CalendarIcon } from "lucide-react";
// import { cn } from "@/lib/utils";

// function formatYmdLocal(d: Date) {
//   const y = d.getFullYear();
//   const m = String(d.getMonth() + 1).padStart(2, "0");
//   const day = String(d.getDate()).padStart(2, "0");
//   return `${y}-${m}-${day}`;
// }

// type LocationOption = {
//   id: string;
//   name: string;
//   zones: { id: string; name: string }[];
// };

// type ContractFormProps = {
//   action: (formData: FormData) => Promise<void>; // <- server action prop
//   assetId: string;
//   clientId?: string;
//   initialStartDate?: Date;
//   minStartDate?: Date;
//   locations: LocationOption[];
// };

// export function ContractForm({
//   action,
//   assetId,
//   clientId,
//   initialStartDate,
//   minStartDate,
//   locations,
// }: ContractFormProps) {
//   const [startDate, setStartDate] = useState<Date>(
//     initialStartDate ?? new Date(),
//   );
//   const [monthlyRate, setMonthlyRate] = useState<string>("");

//     const [locationId, setLocationId] = useState<string>("");
//   const zones = useMemo(
//     () => locations.find((l) => l.id === locationId)?.zones ?? [],
//     [locations, locationId],
//   );
//   const [locationZoneId, setLocationZoneId] = useState<string>("");

//     const canSubmit = Boolean(monthlyRate) && Boolean(locationId);

//   return (
//     <form action={action} className="grid gap-3 sm:grid-cols-2">
//       <input type="hidden" name="assetId" value={assetId} />
//       <input type="hidden" name="clientId" value={clientId ?? ""} />
//       <input type="hidden" name="startDate" value={formatYmdLocal(startDate)} />

//       <div className="sm:col-span-1">
//         <Label htmlFor="monthlyRate">Monthly rate (GBP)</Label>
//         <Input
//           id="monthlyRate"
//           name="monthlyRate"
//           type="number"
//           inputMode="decimal"
//           step="0.01"
//           min="0"
//           placeholder="0.00"
//           value={monthlyRate}
//           onChange={(e) => setMonthlyRate(e.target.value)}
//           required
//         />
//       </div>

//       <div className="sm:col-span-1">
//         <Label>Start date</Label>
//         <Popover>
//           <PopoverTrigger asChild>
//             <Button
//               type="button"
//               variant="outline"
//               className={cn("w-full justify-start text-left font-normal")}
//             >
//               <CalendarIcon className="mr-2 h-4 w-4" />
//               {startDate.toLocaleDateString("en-GB")}
//             </Button>
//           </PopoverTrigger>
//           <PopoverContent className="w-auto p-0" align="start">
//             <Calendar
//               mode="single"
//               selected={startDate}
//               onSelect={(d) => d && setStartDate(d)}
//               hidden={minStartDate ? { before: minStartDate } : undefined}
//               autoFocus
//             />
//           </PopoverContent>
//         </Popover>
//       </div>

//       <div className="mt-2 sm:col-span-2">
//         <Button type="submit" disabled={!monthlyRate}>
//           Create contract
//         </Button>
//       </div>
//     </form>
//   );
// }

"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function formatYmdLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type LocationOption = {
  id: string;
  name: string;
  zones: { id: string; name: string }[];
};

type ContractFormProps = {
  action: (formData: FormData) => Promise<void>;
  assetId: string;
  clientId?: string;
  initialStartDate?: Date;
  minStartDate?: Date;
  /** NEW: locations to choose from */
  locations: LocationOption[];
};

export function ContractForm({
  action,
  assetId,
  clientId,
  initialStartDate,
  minStartDate,
  locations,
}: ContractFormProps) {
  const [startDate, setStartDate] = useState<Date>(
    initialStartDate ?? new Date(),
  );
  const [monthlyRate, setMonthlyRate] = useState<string>("");

  // NEW: location state
  const [locationId, setLocationId] = useState<string>("");
  const zones = useMemo(
    () => locations.find((l) => l.id === locationId)?.zones ?? [],
    [locations, locationId],
  );
  const [locationZoneId, setLocationZoneId] = useState<string>("");

  const canSubmit = Boolean(monthlyRate) && Boolean(locationId);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="assetId" value={assetId} />
      <input type="hidden" name="clientId" value={clientId ?? ""} />
      <input type="hidden" name="startDate" value={formatYmdLocal(startDate)} />
      {/* NEW: post location selections */}
      <input type="hidden" name="locationId" value={locationId} />
      <input type="hidden" name="locationZoneId" value={locationZoneId} />

      <div className="sm:col-span-1">
        <Label htmlFor="monthlyRate">Monthly rate (GBP)</Label>
        <Input
          id="monthlyRate"
          name="monthlyRate"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={monthlyRate}
          onChange={(e) => setMonthlyRate(e.target.value)}
          required
        />
      </div>

      <div className="sm:col-span-1">
        <Label>Start date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn("w-full justify-start text-left font-normal")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate.toLocaleDateString("en-GB")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={(d) => d && setStartDate(d)}
              hidden={minStartDate ? { before: minStartDate } : undefined}
              autoFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* NEW: Location */}
      <div className="sm:col-span-1">
        <Label>Location</Label>
        <Select
          value={locationId}
          onValueChange={(v) => {
            setLocationId(v);
            setLocationZoneId(""); // reset zone when location changes
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent>
            {locations.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* NEW: Sub-location (only if the chosen location has zones) */}
      {zones.length > 0 && (
        <div className="sm:col-span-1">
          <Label>Sub-location</Label>
          <Select
            value={locationZoneId}
            onValueChange={(v) => setLocationZoneId(v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select sub-location (optional)" />
            </SelectTrigger>
            <SelectContent>
              {zones.map((z) => (
                <SelectItem key={z.id} value={z.id}>
                  {z.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="mt-2 sm:col-span-2">
        <Button type="submit" disabled={!canSubmit}>
          Create contract
        </Button>
      </div>
    </form>
  );
}
