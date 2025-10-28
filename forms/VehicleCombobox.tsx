// "use client";
// import {
//   Command,
//   CommandEmpty,
//   CommandGroup,
//   CommandInput,
//   CommandItem,
// } from "@/components/ui/command";
// import { Check, ChevronsUpDown, Plus } from "lucide-react";
// import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
// import { useState } from "react";
// import { Asset, AssetInput } from "@/lib/types"; // Use your Asset type!
// import { Button } from "../ui/button";
// import { cn } from "@/lib/utils";

// type VehicleComboboxProps = {
//   vehiclesList: Asset[];
//   value: AssetInput | null;
//   onChange: (vehicle: Asset | null) => void;
//   loading?: boolean;
//   error?: Error | null | undefined;
// };

// export function VehicleCombobox({
//   vehiclesList,
//   value,
//   onChange,
//   loading,
//   error,
// }: VehicleComboboxProps) {
//   const [open, setOpen] = useState(false);
//   const [search, setSearch] = useState("");

//   const handleSelect = (vehicle: Asset | null) => {
//     onChange(vehicle);
//     setOpen(false);
//     setSearch("");
//   };

//   if (loading) return <div>Loading vehicles…</div>;
//   if (error)
//     return <div className="text-destructive">Error: {error.message}</div>;

//   if (!loading && !error && vehiclesList.length === 0) {
//     return (
//       <div className="text-muted-foreground text-sm py-3 px-2 rounded bg-muted/40 border">
//         No vehicles found for this client.
//         <br />
//         Add new vehicle to continue.
//       </div>
//     );
//   }

//   return (
//     <Popover open={open} onOpenChange={setOpen}>
//       <PopoverTrigger asChild>
//         <Button
//           variant="outline"
//           role="combobox"
//           aria-expanded={open}
//           className="w-full justify-between"
//         >
//           {value
//             ? `${value.identifier}${
//                 value.make
//                   ? ` (${value.make}${value.model ? " " + value.model : ""})`
//                   : ""
//               }`
//             : "Select or add vehicle..."}
//           <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
//         </Button>
//       </PopoverTrigger>

//       <PopoverContent
//         className="w-full p-0 max-h-72 overflow-y-auto"
//         style={{ width: "var(--radix-popover-trigger-width)" }}
//       >
//         <Command
//           filter={(_value: string, search: string, keywords: string[] = []) => {
//             const haystack = keywords.join(" ").toLowerCase();
//             return haystack.includes(search.toLowerCase()) ? 1 : 0;
//           }}
//         >
//           <CommandInput
//             placeholder="Search vehicles..."
//             value={search}
//             onValueChange={setSearch}
//             autoFocus
//           />
//           <CommandEmpty>No vehicle found.</CommandEmpty>

//           <CommandGroup>
//             {vehiclesList.map((vehicle) => (
//               <CommandItem
//                 key={vehicle.id}
//                 aria-label={`${vehicle.identifier}${
//                   vehicle.make
//                     ? ` (${vehicle.make}${
//                         vehicle.model ? " " + vehicle.model : ""
//                       })`
//                     : ""
//                 }`}
//                 value={vehicle.id}
//                 onSelect={() => handleSelect(vehicle)}
//                 className="py-2"
//                 keywords={[
//                   vehicle.identifier,
//                   vehicle.make ?? "",
//                   vehicle.model ?? "",
//                   vehicle.colour ?? "",
//                   vehicle.year?.toString() ?? "",
//                 ]}
//               >
//                 <Check
//                   className={cn(
//                     "mr-2 h-4 w-4 mt-1",
//                     value?.id === vehicle.id ? "opacity-100" : "opacity-0"
//                   )}
//                 />
//                 <div className="flex flex-col">
//                   <span className="font-medium">
//                     {vehicle.identifier}
//                     {vehicle.make || vehicle.model ? (
//                       <span className="text-xs text-muted-foreground ml-2">
//                         {vehicle.make} {vehicle.model}
//                       </span>
//                     ) : null}
//                   </span>
//                   {(vehicle.colour || vehicle.year) && (
//                     <span className="text-xs text-muted-foreground flex gap-2 mt-0.5">
//                       {vehicle.colour && <span>{vehicle.colour}</span>}
//                       {vehicle.year && <span>{vehicle.year}</span>}
//                     </span>
//                   )}
//                 </div>
//               </CommandItem>
//             ))}

//             <CommandItem
//               onSelect={() => handleSelect(null)}
//               value="add_new"
//               keywords={["add", "new", "vehicle"]}
//               className="py-2"
//             >
//               <Check className="mr-2 h-4 w-4 opacity-0" />
//               <Plus className="mr-2 h-4 w-4" />
//               Add new vehicle
//             </CommandItem>
//           </CommandGroup>
//         </Command>
//       </PopoverContent>
//     </Popover>
//   );
// }

"use client";
import { Car } from "lucide-react";
import { EntityCombobox } from "./EntityCombobox";
import { AssetWithStatus } from "@/lib/types"; // Update to your actual types

type VehicleComboboxProps = {
  vehiclesList: AssetWithStatus[];
  value: AssetWithStatus | null;
  onChange: (vehicle: AssetWithStatus | null) => void;
  loading?: boolean;
  error?: Error | null | undefined;
};

export function VehicleCombobox({
  vehiclesList,
  value,
  onChange,
  loading,
  error,
}: VehicleComboboxProps) {
  return (
    <EntityCombobox<AssetWithStatus>
      items={vehiclesList}
      value={value}
      onChange={onChange}
      getKey={(vehicle) => vehicle.id}
      getDisplayLabel={(vehicle) =>
        `${vehicle.identifier}${
          vehicle.make
            ? ` (${vehicle.make}${vehicle.model ? " " + vehicle.model : ""})`
            : ""
        }`
      }
      getDisplayNode={(v) => (
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-medium">
              {v.identifier}
              {(v.make || v.model) && (
                <span className="text-muted-foreground ml-2 text-xs">
                  {v.make} {v.model}
                </span>
              )}
            </span>
            {(v.colour || v.year) && (
              <span className="text-muted-foreground mt-0.5 flex gap-2 text-xs">
                {v.colour && <span>{v.colour}</span>}
                {v.year && <span>{v.year}</span>}
              </span>
            )}
          </div>
          {/* {v.isCheckedIn && (
            <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-900">
              Checked in
            </span>
          )} */}
        </div>
      )}
      getKeywords={(vehicle) => [
        vehicle.identifier,
        vehicle.make ?? "",
        vehicle.model ?? "",
        vehicle.colour ?? "",
        vehicle.year?.toString() ?? "",
      ]}
      addNewLabel="Add new vehicle"
      loading={loading}
      error={error}
      placeholder="Select or add vehicle..."
      emptyMessage="No vehicles found for this customer."
      icon={<Car />}
    />
  );
}
