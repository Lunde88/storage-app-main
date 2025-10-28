// "use client";
// import { useClerkSupabaseClient } from "@/lib/supabaseClient";
// import { useAuth } from "@clerk/nextjs";
// import useSWR from "swr";

// import { CircleUserRound, UserRoundPlus } from "lucide-react";

// import { fetchLatestClients } from "@/lib/data-fetching/fetchLatestClients";
// import MainCard from "../base/card/MainCard";
// import MainCardHeader from "../base/card/MainCardHeader";
// import IconButton from "../base/buttons/IconButton";
// import MainCardContent from "../base/card/MainCardContent";
// import CardLoadingSpinner from "../base/card/CardLoadingSpinner";
// import CardError from "../base/card/CardError";
// import CardList from "../base/card/CardList";
// import CardListItem from "../base/card/CardListItem";
// import CardNoContent from "../base/card/CardNoContent";
// import MainCardFooter from "../base/card/MainCardFooter";
// import CardButton from "../base/buttons/CardButton";
// import ClientListItemContent from "../client/ClientListItemContent";

// export default function LatestClients() {
//   const { isLoaded, isSignedIn } = useAuth();
//   const supabase = useClerkSupabaseClient();

//   // Only start fetching when Clerk is loaded and signed in
//   const shouldFetch = isLoaded && isSignedIn && !!supabase;

//   const {
//     data: clients,
//     isLoading,
//     error,
//   } = useSWR(shouldFetch ? "latest-clients" : null, () =>
//     fetchLatestClients(supabase),
//   );

//   return (
//     <>
//       <MainCard>
//         <MainCardHeader title="Clients" icon={<CircleUserRound />}>
//           <IconButton>
//             <UserRoundPlus />
//           </IconButton>
//         </MainCardHeader>
//         <MainCardContent>
//           {isLoading || !isLoaded ? (
//             <CardLoadingSpinner />
//           ) : error ? (
//             <CardError text="Error loading clients." />
//           ) : clients && clients.length ? (
//             <CardList>
//               {clients.map((v, idx) => (
//                 <CardListItem href={`/clients/${v.id}`} key={v.id}>
//                   <ClientListItemContent
//                     idx={idx}
//                     id={v.id}
//                     firstName={v.firstName}
//                     lastName={v.lastName}
//                     overdueAmount={idx === 0 ? 240.0 : undefined}
//                     vehicleCount={v.vehicleCount}
//                   />
//                 </CardListItem>
//               ))}
//             </CardList>
//           ) : (
//             <CardNoContent text="No recent clients yet. Newly added clients will appear here." />
//           )}
//         </MainCardContent>
//         <MainCardFooter>
//           <CardButton buttonText="View All" />
//         </MainCardFooter>
//       </MainCard>
//     </>
//   );
// }

"use client";

import { useClerkSupabaseClient } from "@/lib/supabaseClient";
import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";

import { CircleUserRound, UserRoundPlus } from "lucide-react";
import {
  fetchLatestClients,
  type LatestClientRow,
} from "@/lib/data-fetching/fetchLatestClients";

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
import ClientListItemContent from "../client/ClientListItemContent";

export default function LatestClients() {
  const { isLoaded, isSignedIn } = useAuth();
  const supabase = useClerkSupabaseClient();

  // Only fetch when Clerk is loaded and the user is signed in.
  const canFetch = isLoaded && isSignedIn;

  const {
    data: clients,
    isLoading,
    error,
  } = useSWR<LatestClientRow[]>(
    canFetch ? "latest-clients" : null,
    () => fetchLatestClients(supabase),
    {
      keepPreviousData: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      // avoid infinite retries on auth errors — let focus refresh handle it
      onErrorRetry: (err, _key, _cfg, _revalidate, ctx) => {
        const status = err?.status ?? err?.code;
        if (status === 401 || status === 403) return;
        if (ctx.retryCount >= 3) return;
      },
    },
  );

  // While Clerk is initializing, show spinner (prevents a flash of "no content")
  if (!isLoaded) {
    return (
      <MainCard>
        <MainCardHeader title="Clients" icon={<CircleUserRound />}>
          <IconButton aria-label="Add client">
            <UserRoundPlus />
          </IconButton>
        </MainCardHeader>
        <MainCardContent>
          <CardLoadingSpinner />
        </MainCardContent>
        <MainCardFooter>
          <CardButton buttonText="View All" />
        </MainCardFooter>
      </MainCard>
    );
  }

  return (
    <MainCard>
      <MainCardHeader title="Clients" icon={<CircleUserRound />}>
        <IconButton aria-label="Add client">
          <UserRoundPlus />
        </IconButton>
      </MainCardHeader>

      <MainCardContent>
        {isLoading ? (
          <CardLoadingSpinner />
        ) : error ? (
          <CardError text="Error loading clients." />
        ) : clients && clients.length ? (
          <CardList>
            {clients.map((c, idx) => (
              <CardListItem href={`/clients/${c.id}`} key={c.id}>
                <ClientListItemContent
                  idx={idx}
                  id={c.id}
                  firstName={c.firstName}
                  lastName={c.lastName}
                  vehicleCount={c.vehicleCount}
                  checkedInCount={c.checkedInCount}
                  activeContractMonthlyTotal={c.activeContractMonthlyTotal}
                  activeContractCount={c.activeContractCount}
                  services={c.services}
                />
              </CardListItem>
            ))}
          </CardList>
        ) : (
          <CardNoContent text="No recent clients yet. Newly added clients will appear here." />
        )}
      </MainCardContent>

      <MainCardFooter>
        <CardButton buttonText="View All" />
      </MainCardFooter>
    </MainCard>
  );
}
