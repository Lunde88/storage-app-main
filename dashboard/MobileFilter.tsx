"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LocationSelect } from "@/components/locations/LocationSelect";
import {
  ArrowDownWideNarrow,
  ArrowDownZA,
  ArrowUpAZ,
  ArrowUpWideNarrow,
  ChevronDown,
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
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

type MobileFilterProps = {
  locations: { id: string; name: string }[];
  selectedLocation: string;
  onLocationChange: (value: string) => void;
  order: string;
  onOrderChange: (value: string) => void;
  page: number;
  onPageChange: (value: number) => void;
  totalCount: number;
  onRefresh: () => void;
  isLoading: boolean;
};

export default function MobileFilter({
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
}: MobileFilterProps) {
  const PAGE_SIZE = 9; // Or receive as a prop if you want to make this user-configurable
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  return (
    <div className="flex w-full items-center justify-between pb-3 lg:hidden">
      <LocationSelect
        id="location"
        label="Location"
        value={selectedLocation}
        onValueChange={onLocationChange}
        options={locations}
        placeholder="All locations"
      />

      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            className="!text-primary !shadow-regular flex !h-[48px] flex-1 items-center justify-between rounded-[56px] bg-white p-3 text-base font-medium"
            aria-label="Open filters"
          >
            <div className="flex items-center">
              <ArrowDownWideNarrow className="mr-1 !h-6 !w-6" />
              <span>Filter / Sort</span>
            </div>
            <ChevronDown className="ml-2 !h-6 !w-6 text-[#2D3ECD]" />
          </Button>
        </SheetTrigger>
        <SheetContent side="top" className="h-[200px] px-4 pt-8">
          <SheetTitle className="text-lg">Filter</SheetTitle>
          <SheetDescription hidden>Filter items in the list</SheetDescription>
          <div className="flex flex-col gap-4">
            {/* Pagination */}
            <div className="bg-secondary rounded-4xl border px-3">
              <ul className="flex items-center justify-center gap-x-3">
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
            {/* Sort buttons */}
            <div className="flex gap-4">
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
              {/* Refresh */}
              <IconButton
                onClick={onRefresh}
                loading={isLoading}
                aria-label="Refresh"
                className="shadow-none"
              >
                <RefreshCw
                  className={cn("!h-6 !w-6", isLoading && "animate-spin")}
                />
              </IconButton>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
