// "use client";
// import { Button } from "@/components/ui/button";
// import {
//   ArrowDownWideNarrow,
//   ArrowDownZA,
//   ArrowUpAZ,
//   ArrowUpWideNarrow,
//   ChevronLeft,
//   ChevronRight,
//   ChevronsLeft,
//   ChevronsRight,
//   Grid3X3,
//   RefreshCw,
//   Rows3,
// } from "lucide-react";
// import IconButton from "../base/buttons/IconButton";
// import { cn } from "@/lib/utils";
// import { useState } from "react";
// import { LocationSelect } from "@/components/locations/LocationSelect";

// const locationOptions = [
//   { value: "cadney", label: "Cadney" },
//   { value: "doncaster", label: "Doncaster" },
//   { value: "lincoln", label: "Lincoln" },
// ];

// export default function DesktopFilter() {
//   const [isLoading, setIsloading] = useState(false);
//   const [refreshing, setRefreshing] = useState(false);
//   const [selectedLocation, setSelectedLocation] = useState(
//     locationOptions[0]?.value ?? "",
//   );

//   async function handleRefresh() {
//     setRefreshing(true);
//     setIsloading(true);
//     try {
//       // Simulate an async action (e.g. refetch data)
//       await new Promise((resolve) => setTimeout(resolve, 1500));
//       // ...put your actual refresh/fetch logic here!
//     } finally {
//       setRefreshing(false);
//       setIsloading(false);
//     }
//   }

//   return (
//     <div className="hidden justify-between pb-4 md:sticky md:top-28 md:flex">
//       <LocationSelect
//         id="location"
//         label="Location"
//         value={selectedLocation}
//         onValueChange={setSelectedLocation}
//         options={locationOptions}
//         placeholder="Choose a location…"
//       />
//       <div className="flex gap-3 pb-4">
//         <div className="bg-secondary rounded-4xl border px-3 py-1">
//           <ul className="flex items-center gap-x-6">
//             <Button
//               size="icon"
//               className="hover:bg-primary/10 text-primary bg-inherit shadow-none"
//             >
//               <Grid3X3 className="!h-6 !w-6" />
//             </Button>
//             <Button
//               size="icon"
//               className="hover:bg-primary/10 text-primary bg-inherit shadow-none"
//             >
//               <Rows3 className="!h-6 !w-6" />
//             </Button>
//           </ul>
//         </div>
//         <div className="bg-secondary rounded-4xl border px-3 py-1">
//           <ul className="flex items-center gap-x-6">
//             <Button
//               size="icon"
//               className="hover:bg-primary/10 text-primary bg-inherit shadow-none"
//             >
//               <ArrowUpAZ className="!h-6 !w-6" />
//             </Button>
//             <Button
//               size="icon"
//               className="hover:bg-primary/10 text-primary bg-inherith- shadow-none"
//             >
//               <ArrowDownZA className="!h-6 !w-6" />
//             </Button>
//             <Button
//               size="icon"
//               className="hover:bg-primary/10 text-primary bg-inherit shadow-none"
//             >
//               <ArrowDownWideNarrow className="!h-6 !w-6" />
//             </Button>
//             <Button className="hover:bg-primary/10 text-primary bg-inherit shadow-none">
//               <ArrowUpWideNarrow className="!h-6 !w-6" />
//             </Button>
//           </ul>
//         </div>
//         <div className="bg-secondary rounded-4xl border px-3 py-1">
//           <ul className="flex items-center gap-x-3">
//             <li className="">
//               <Button
//                 size="icon"
//                 className="hover:bg-primary/10 text-primary bg-inherit shadow-none"
//               >
//                 <ChevronsLeft className="!h-6 !w-6" />
//               </Button>
//             </li>
//             <li>
//               <Button
//                 size="icon"
//                 className="hover:bg-primary/10 text-primary bg-inherit shadow-none"
//               >
//                 <ChevronLeft className="!h-6 !w-6" />
//               </Button>
//             </li>
//             <li className="flex items-center gap-5">
//               <Button
//                 variant="link"
//                 className="m-0 h-auto w-auto rounded-none bg-inherit p-1 !text-sm font-medium text-[#2D3ECD] shadow-none"
//                 data-active={true}
//               >
//                 <span className="border-b border-[#2D3ECD]">1</span>
//               </Button>
//               <Button
//                 variant="link"
//                 className="m-0 h-auto w-auto rounded-none bg-inherit p-1 !text-sm font-normal text-[#ACA4A4] shadow-none"
//               >
//                 <span className="border-b border-transparent hover:border-[#ACA4A4]">
//                   2
//                 </span>
//               </Button>
//               <Button
//                 variant="link"
//                 className="m-0 h-auto w-auto rounded-none bg-inherit p-1 !text-sm font-normal text-[#ACA4A4] shadow-none"
//               >
//                 <span className="border-b border-transparent hover:border-[#ACA4A4]">
//                   3
//                 </span>
//               </Button>
//             </li>
//             <li>
//               <Button
//                 size="icon"
//                 className="hover:bg-primary/10 text-primary bg-inherit shadow-none"
//               >
//                 <ChevronRight className="!h-6 !w-6" />
//               </Button>
//             </li>

//             <li>
//               <Button
//                 size="icon"
//                 className="hover:bg-primary/10 text-primary bg-inherit shadow-none"
//               >
//                 <ChevronsRight className="!h-6 !w-6" />
//               </Button>
//             </li>
//           </ul>
//         </div>
//         <IconButton
//           onClick={handleRefresh}
//           loading={isLoading}
//           aria-label="Refresh"
//           className="shadow-none"
//         >
//           <RefreshCw
//             className={cn(
//               "!h-6 !w-6", // Always add these
//               (isLoading || refreshing) && "animate-spin", // Conditionally add this
//             )}
//           />
//         </IconButton>
//       </div>
//     </div>
//   );
// }

//    {navLinks.map(({ label, href, icon: Icon, className }) => {
//           const isActive = pathname === href;
//           return (
//             <li key={label}>
//               <Button
//                 asChild
//                 variant={"ghost"}
//                 size="icon"
//                 aria-label={label}
//                 aria-current={isActive ? "page" : undefined}
//                 className={cn(
//                   isActive && "bg-primary/10",
//                   "hover:bg-primary/10",
//                 )}
//               >
//                 <Link href={href}>
//                   <Icon className={cn("!h-6 !w-6", className)} />
//                 </Link>
//               </Button>
//             </li>
//           );
//         })}

"use client";
import { Button } from "@/components/ui/button";
import {
  ArrowDownWideNarrow,
  ArrowDownZA,
  ArrowUpAZ,
  ArrowUpWideNarrow,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Grid3X3,
  RefreshCw,
  Rows3,
} from "lucide-react";
import IconButton from "../base/buttons/IconButton";
import { cn } from "@/lib/utils";
import { LocationSelect } from "@/components/locations/LocationSelect";
import { LocationDetails } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

// type Location = { value: string; label: string };
type DashboardLocation = Pick<LocationDetails, "id" | "name">;

type DesktopFilterProps = {
  locations: DashboardLocation[];
  selectedLocation: string;
  onLocationChange: (value: string) => void;
  order: string;
  onOrderChange: (value: string) => void;
  page: number;
  onPageChange: (value: number) => void;
  totalCount: number;
  onRefresh: () => void;
  isLoading: boolean;
  // ...add more for sort, search, etc. if you want
};

export default function DesktopFilter({
  locations,
  selectedLocation,
  onLocationChange,
  order,
  onOrderChange,
  page,
  onPageChange,
  totalCount,
  onRefresh,
  isLoading,
}: DesktopFilterProps) {
  // Pagination
  const PAGE_SIZE = 9; // Or receive as a prop if you want to make this user-configurable
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="hidden justify-between pb-4 md:top-28 md:flex-col-reverse lg:sticky lg:flex lg:flex-row">
      <LocationSelect
        id="location"
        label="Location"
        value={selectedLocation}
        onValueChange={onLocationChange}
        options={locations}
        placeholder="All locations"
      />
      <div className="flex gap-3 pb-4">
        <div className="bg-secondary rounded-4xl border px-3 py-1">
          <ul className="flex items-center gap-x-6">
            <Tooltip delayDuration={800}>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className="hover:bg-primary/10 text-primary bg-inherit shadow-none"
                >
                  <Grid3X3 className="!h-6 !w-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Grid view</TooltipContent>
            </Tooltip>

            <Tooltip delayDuration={800}>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className="hover:bg-primary/10 text-primary bg-inherit shadow-none"
                >
                  <Rows3 className="!h-6 !w-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>List view</TooltipContent>
            </Tooltip>
          </ul>
        </div>
        <div className="bg-secondary rounded-4xl border px-3 py-1">
          <ul className="flex items-center gap-x-6">
            <Tooltip delayDuration={800}>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className={cn(
                    "hover:bg-primary/10 text-primary bg-inherit shadow-none",
                    order === "asc" && "bg-primary/10", // highlight active
                  )}
                  onClick={() => onOrderChange("asc")}
                  aria-label="Sort ascending"
                >
                  <ArrowUpAZ className="!h-6 !w-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sort A-Z</TooltipContent>
            </Tooltip>

            <Tooltip delayDuration={800}>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className={cn(
                    "hover:bg-primary/10 text-primary bg-inherit shadow-none",
                    order === "desc" && "bg-primary/10",
                  )}
                  onClick={() => onOrderChange("desc")}
                  aria-label="Sort descending"
                >
                  <ArrowDownZA className="!h-6 !w-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sort Z-A</TooltipContent>
            </Tooltip>

            <Button
              size="icon"
              className="hover:bg-primary/10 text-primary bg-inherit shadow-none"
            >
              <ArrowDownWideNarrow className="!h-6 !w-6" />
            </Button>
            <Button className="hover:bg-primary/10 text-primary bg-inherit shadow-none">
              <ArrowUpWideNarrow className="!h-6 !w-6" />
            </Button>
          </ul>
        </div>
        {/* Pagination */}
        <div className="bg-secondary rounded-4xl border px-3 py-1">
          <ul className="flex items-center gap-x-3">
            <li className="">
              <Button
                size="icon"
                onClick={() => onPageChange(1)}
                disabled={page === 1}
                aria-label="First page"
                className="hover:bg-primary/10 text-primary bg-inherit shadow-none"
              >
                <ChevronsLeft className="!h-6 !w-6" />
              </Button>
            </li>
            <li>
              <Button
                size="icon"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
                aria-label="Previous page"
                className="hover:bg-primary/10 text-primary bg-inherit shadow-none"
              >
                <ChevronLeft className="!h-6 !w-6" />
              </Button>
            </li>
            <li className="flex items-center gap-5">
              {[...Array(totalPages).keys()].map((i) => (
                <Button
                  key={i + 1}
                  variant="link"
                  className={cn(
                    "m-0 h-auto w-auto rounded-none bg-inherit p-1 !text-sm font-normal text-[#ACA4A4] shadow-none",
                  )}
                  onClick={() => onPageChange(i + 1)}
                  data-active={page === i + 1}
                >
                  <span
                    className={cn(
                      "transition-colors",
                      page === i + 1
                        ? "border-b-2 border-[#2D3ECD] font-medium text-[#2D3ECD]"
                        : "border-b-2 border-transparent hover:border-[#ACA4A4]",
                    )}
                  >
                    {i + 1}
                  </span>
                </Button>
              ))}
            </li>
            <li>
              <Button
                size="icon"
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages}
                aria-label="Next page"
                className="hover:bg-primary/10 text-primary bg-inherit shadow-none"
              >
                <ChevronRight className="!h-6 !w-6" />
              </Button>
            </li>

            <li>
              <Button
                size="icon"
                onClick={() => onPageChange(totalPages)}
                disabled={page === totalPages}
                aria-label="Last page"
                className="hover:bg-primary/10 text-primary bg-inherit shadow-none"
              >
                <ChevronsRight className="!h-6 !w-6" />
              </Button>
            </li>
          </ul>
        </div>
        <IconButton
          onClick={onRefresh}
          loading={isLoading}
          aria-label="Refresh"
          className="shadow-none"
        >
          <RefreshCw className={cn("!h-6 !w-6", isLoading && "animate-spin")} />
        </IconButton>
      </div>
    </div>
  );
}
