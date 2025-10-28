// import { DashboardClient } from "@/lib/types";
// import CardDivider from "../base/card/CardDivider";
// import { Badge } from "../ui/badge";
// import React from "react";

// type ClientListItemContentProps = DashboardClient & {
//   idx: number;
// };

// export default function ClientListItemContent({
//   firstName,
//   lastName,
//   idx,
//   overdueAmount,
//   vehicleCount,
// }: ClientListItemContentProps) {
//   // Service selection logic
//   const service = idx === 0 ? ["valet", "charging"] : [];

//   return (
//     <div className="space-y-2">
//       <div className="flex items-center justify-between">
//         <p className="font-medium">
//           {firstName} {lastName}
//         </p>
//         <p className="text-sm">
//           {" "}
//           {vehicleCount} Vehicle{vehicleCount === 1 ? "" : "s"}
//         </p>
//         {/* You can add more client info here if needed */}
//       </div>

//       <div className="flex items-center justify-between">
//         <p className="text-sm">Services:</p>
//         <div className="space-x-1">
//           {service.length > 0 &&
//             service.map((item) => (
//               <Badge
//                 key={item}
//                 className="rounded-[4px] bg-[#F0F1FF] px-2 py-0 text-sm text-[#2D3ECD] capitalize"
//               >
//                 {item}
//               </Badge>
//             ))}
//         </div>
//       </div>
//       <CardDivider />
//       <div className="flex items-center justify-between">
//         <p className="text-sm">Invoice date:</p>
//         <div className="space-x-1">
//           {overdueAmount && (
//             <Badge className="rounded-[4px] bg-[#FFE4E7] px-2 py-0 text-sm text-[#86101E] capitalize">
//               Overdue: <span className="font-normal">£{overdueAmount}</span>
//             </Badge>
//           )}
//         </div>
//       </div>
//       <div className="flex items-center justify-between">
//         <p className="text-sm">Next collection:</p>
//         <div className="space-x-1">
//           {idx === 0 && (
//             <Badge className="rounded-[4px] bg-[#527402] px-2 py-0 text-sm font-light text-[#FFFFFF] capitalize">
//               19/06/25
//             </Badge>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

import CardDivider from "../base/card/CardDivider";
import { Badge } from "../ui/badge";
import React from "react";

const SERVICE_ORDER = ["valet", "charging", "cover", "MOT", "service"];

type ClientListItemContentProps = {
  idx: number;
  id: string;
  firstName: string | null;
  lastName: string | null;
  vehicleCount: number;
  checkedInCount: number;
  activeContractMonthlyTotal: number; // GBP
  activeContractCount: number;
  services: string[];
};

const fmtGBP = (n: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(n);

export default function ClientListItemContent({
  firstName,
  lastName,
  vehicleCount,
  checkedInCount,
  activeContractMonthlyTotal,
  activeContractCount,
  services,
}: ClientListItemContentProps) {
  const orderedServices = [...services].sort(
    (a, b) => SERVICE_ORDER.indexOf(a) - SERVICE_ORDER.indexOf(b),
  );

  return (
    <div className="space-y-2">
      {/* Row 1: Name + fleet summary */}
      <div className="flex items-center justify-between">
        <p className="font-medium">
          {[firstName, lastName].filter(Boolean).join(" ") || "Unnamed client"}
        </p>
        <p className="text-sm">
          {vehicleCount === 0
            ? "No vehicles yet"
            : `${checkedInCount}/${vehicleCount} checked in`}
        </p>
      </div>

      {/* Row 2: Revenue + active contracts */}
      <div className="flex items-center justify-between">
        <p className="text-sm">Active contracts</p>
        <p className="text-sm">
          {activeContractCount === 0
            ? "No contracts"
            : `${activeContractCount} · ${fmtGBP(activeContractMonthlyTotal)}/mo`}
        </p>
      </div>

      {/* Row 3: Services (from latest check-in movement) */}
      <div className="flex items-center justify-between">
        <p className="text-sm">Services</p>
        <div className="flex flex-wrap justify-end gap-1">
          {orderedServices.length === 0 ? (
            <span className="text-muted-foreground text-xs">None</span>
          ) : (
            orderedServices.map((svc) => (
              <Badge
                key={svc}
                className="rounded-[4px] bg-[#F0F1FF] px-2 py-0 text-sm text-[#2D3ECD] capitalize"
              >
                {svc}
              </Badge>
            ))
          )}
        </div>
      </div>

      <CardDivider />
      {/* Optional: room for future “next collection” / tasks once you add bookings */}
      <div className="flex items-center justify-between">
        <p className="text-sm">Next collection</p>
        <span className="text-muted-foreground text-xs">—</span>
      </div>
    </div>
  );
}
