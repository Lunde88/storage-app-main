// "use client";
// import { useClerkSupabaseClient } from "@/lib/supabaseClient";
// import { useAuth } from "@clerk/nextjs";
// import useSWR from "swr";

// import { fetchRecentCheckIns } from "@/lib/data-fetching/fetchRecentCheckIns";

// import Link from "next/link";
// import { ChevronRight, Loader2, RefreshCw } from "lucide-react";
// import { Button } from "../ui/button";
// import {
//   Card,
//   CardContent,
//   CardFooter,
//   CardHeader,
//   CardTitle,
// } from "../ui/card";
// import { useState } from "react";
// import { cn } from "@/lib/utils";

// export default function LatestCheckins() {
//   const { isLoaded, isSignedIn } = useAuth();
//   const supabase = useClerkSupabaseClient();

//   const [refreshing, setRefreshing] = useState(false);

//   // Only start fetching when Clerk is loaded and signed in
//   const shouldFetch = isLoaded && isSignedIn && !!supabase;

//   const {
//     data: checkIns,
//     isLoading,
//     error,
//     mutate,
//   } = useSWR(shouldFetch ? "recent-check-ins" : null, () =>
//     fetchRecentCheckIns(supabase),
//   );

//   const handleRefresh = async () => {
//     setRefreshing(true);
//     // Create a promise for a 600ms timer
//     const minDelay = new Promise((resolve) => setTimeout(resolve, 600));
//     // Fetch new data
//     await Promise.all([mutate(), minDelay]);
//     setRefreshing(false);
//   };

//   // Show a spinner while Clerk is not ready
//   // if (!isLoaded) {
//   //   return (
//   //     <div className="flex py-8 w-full items-center justify-center">
//   //       <Loader2 className="animate-spin text-muted-foreground" size={20} />
//   //     </div>
//   //   );
//   // }

//   return (
//     <>
//       <Card className="!shadow-regular w-[351px] gap-3 py-3">
//         <CardHeader className="px-3">
//           <div className="flex w-full items-center justify-between">
//             <CardTitle className="text-lg">Latest Check-ins</CardTitle>
//             <Button
//               size="icon"
//               variant="outline"
//               disabled={isLoading || refreshing}
//               className="bg-secondary h-12 w-12 shadow-[4px_4px_4px_0px_#0000000A]"
//               onClick={handleRefresh}
//             >
//               <RefreshCw
//                 className={cn(
//                   "!h-6 !w-6", // Always add these
//                   (isLoading || refreshing) && "animate-spin", // Conditionally add this
//                 )}
//               />
//             </Button>
//           </div>
//         </CardHeader>
//         <CardContent className="px-3">
//           {isLoading || !isLoaded ? (
//             <div className="flex w-full items-center justify-center py-8">
//               <Loader2
//                 className="text-muted-foreground animate-spin"
//                 size={20}
//               />
//             </div>
//           ) : error ? (
//             <div className="text-destructive text-sm">
//               Error loading check-ins.
//             </div>
//           ) : checkIns && checkIns.length ? (
//             <ul className="space-y-2">
//               {checkIns.map((v) => (
//                 <Link
//                   href={`/vehicle/${v.assetId}`}
//                   key={v.assetId}
//                   className="flex items-center justify-between rounded-md border-1 p-3"
//                 >
//                   <div className="space-y-1">
//                     <p className="text-sm font-medium">{v.identifier}</p>
//                     <p className="text-xs font-medium">
//                       {v.make} {v.model} - {v.colour && <>{v.colour}</>}{" "}
//                       {v.year && <> - {v.year}</>}
//                     </p>

//                     {v.checkinDate && (
//                       <div className="text-xs">
//                         Checked in{" "}
//                         {(() => {
//                           const date = new Date(v.checkinDate);
//                           const [d, t] = date
//                             .toLocaleString("en-GB", {
//                               day: "2-digit",
//                               month: "2-digit",
//                               year: "2-digit",
//                               hour: "2-digit",
//                               minute: "2-digit",
//                               hour12: false,
//                             })
//                             .split(", ");
//                           return `${d} at ${t}`;
//                         })()}
//                       </div>
//                     )}
//                   </div>
//                   <ChevronRight />
//                 </Link>
//               ))}
//             </ul>
//           ) : (
//             <div className="text-muted-foreground text-sm">
//               No recent check-ins yet. Your recent activity will appear here.
//             </div>
//           )}
//         </CardContent>
//         <CardFooter className="px-3">
//           <Button className="w-full bg-[#007AD2]">View All</Button>
//         </CardFooter>
//       </Card>
//     </>
//   );
// }

"use client";
import { useState } from "react";

import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";

import { RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { useClerkSupabaseClient } from "@/lib/supabaseClient";
import { fetchRecentCheckIns } from "@/lib/data-fetching/fetchRecentCheckIns";

import VehicleListItemContent from "../vehicle/VehicleListItemContent";
import MainCard from "../base/card/MainCard";
import MainCardHeader from "../base/card/MainCardHeader";
import IconButton from "../base/buttons/IconButton";
import MainCardContent from "../base/card/MainCardContent";
import CardLoadingSpinner from "../base/card/CardLoadingSpinner";
import CardError from "../base/card/CardError";
import CardList from "../base/card/CardList";
import CardListItem from "../base/card/CardListItem";
import CardNoContent from "../base/card/CardNoContent";
import MainCardFooter from "../base/card/MainCardFooter";
import CardButton from "../base/buttons/CardButton";

export default function LatestCheckins() {
  const { isLoaded, isSignedIn } = useAuth();
  const supabase = useClerkSupabaseClient();

  const [refreshing, setRefreshing] = useState(false);

  // Only start fetching when Clerk is loaded and signed in
  const shouldFetch = isLoaded && isSignedIn && !!supabase;

  const {
    data: checkIns,
    isLoading,
    error,
    mutate,
  } = useSWR(shouldFetch ? "recent-check-ins" : null, () =>
    fetchRecentCheckIns(supabase),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    // Create a promise for a 600ms timer
    const minDelay = new Promise((resolve) => setTimeout(resolve, 600));
    // Fetch new data
    await Promise.all([mutate(), minDelay]);
    setRefreshing(false);
  };

  return (
    <>
      <MainCard>
        <MainCardHeader title={"Latest Check-ins"}>
          <IconButton
            onClick={handleRefresh}
            loading={isLoading}
            aria-label="Refresh"
          >
            <RefreshCw
              className={cn(
                "!h-6 !w-6", // Always add these
                (isLoading || refreshing) && "animate-spin", // Conditionally add this
              )}
            />
          </IconButton>
        </MainCardHeader>
        <MainCardContent>
          {isLoading || !isLoaded ? (
            <CardLoadingSpinner />
          ) : error ? (
            <CardError text="Error loading check-ins." />
          ) : checkIns && checkIns.length ? (
            <CardList>
              {checkIns.map((v) => (
                <CardListItem
                  key={v.assetId}
                  href={`/vehicle/${v.assetId}`}
                  // right
                >
                  <VehicleListItemContent
                    identifier={v.identifier}
                    make={v.make}
                    model={v.model}
                    colour={v.colour}
                    year={v.year}
                    client={v.client}
                    lastCheckinTime={v.lastCheckinTime}
                  />
                </CardListItem>
              ))}
            </CardList>
          ) : (
            <CardNoContent text="No recent check-ins yet. Recent activity will appear here." />
          )}
        </MainCardContent>
        <MainCardFooter>
          <CardButton buttonText="View All" />
        </MainCardFooter>
      </MainCard>
    </>
  );
}
