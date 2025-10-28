import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";

type LocationListItemContentProps = {
  label: string;
  capacity: number;
  spacesAvailable: number;
  occupied: number;
  badgeClassName?: string;
};

function getSpacesBadgeColour(spaces: number) {
  if (spaces === 0) return "bg-[#F0F1FF]";
  if (spaces <= 5) return "bg-[#F0F1FF]";
  if (spaces <= 20) return "bg-[#F0F1FF]";
  return "bg-[#F0F1FF]";
}

export default function LocationListItemContent({
  label,
  // capacity,
  spacesAvailable,
  occupied,
  badgeClassName,
}: LocationListItemContentProps) {
  const aria = `Location ${label}: ${occupied}`;
  return (
    <div className="flex w-full items-center justify-between">
      <div className="space-y-1.5">
        <p className="font-medium">{label}</p>
      </div>

      <div className="flex items-center gap-2">
        <p className="text-xs">Vehicles in storage</p>
        {/* <Badge
          aria-label={aria}
          className={cn(
            "rounded-sm px-2 py-0 text-sm text-[#2D3ECD]",
            badgeClassName ?? getSpacesBadgeColour(spacesAvailable),
          )}
        >
          {capacity > 0 ? `${spacesAvailable} / ${capacity}` : "—"}
        </Badge> */}
        <Badge
          aria-label={aria}
          className={cn(
            "rounded-sm px-2 py-0 text-sm text-[#2D3ECD]",
            badgeClassName ?? getSpacesBadgeColour(spacesAvailable),
          )}
        >
          {occupied}
        </Badge>
      </div>
    </div>
  );
}
