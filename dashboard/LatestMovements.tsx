"use client";
import { useState } from "react";

import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";

import { RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { useClerkSupabaseClient } from "@/lib/supabaseClient";

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
import { fetchLatestAssetEvent } from "@/lib/data-fetching/fetchLatestAssetEvent";
import { LatestAssetEvent } from "@/lib/types";

type EventTypeFilter = "all" | "check-in" | "check-out";

export default function LatestCheckins() {
  const { isLoaded, isSignedIn } = useAuth();
  const supabase = useClerkSupabaseClient();

  const [refreshing, setRefreshing] = useState(false);

  const [eventType, setEventType] = useState<"all" | "check-in" | "check-out">(
    "all",
  );

  // Only start fetching when Clerk is loaded and signed in
  const shouldFetch = isLoaded && isSignedIn && !!supabase;

  const {
    data: movements,
    isLoading,
    error,
    mutate,
    isValidating,
  } = useSWR<LatestAssetEvent[]>(
    shouldFetch ? ["recent-movements", eventType] : null,
    () => fetchLatestAssetEvent(supabase, 5, eventType),
    { revalidateOnFocus: false },
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    // Create a promise for a 600ms timer
    const minDelay = new Promise((resolve) => setTimeout(resolve, 600));
    // Fetch new data
    await Promise.all([mutate(), minDelay]);
    setRefreshing(false);
  };

  const busy = isLoading || refreshing || isValidating;

  const noContentMessage =
    eventType === "check-in"
      ? "No recent check-ins yet. Checked-in vehicles will appear here."
      : eventType === "check-out"
        ? "No recent check-outs yet. Checked-out vehicles will appear here."
        : "No recent movements yet. Activity will appear here once vehicles are moved.";

  return (
    <>
      <MainCard>
        <MainCardHeader title={"Latest Movements"}>
          <IconButton
            onClick={handleRefresh}
            loading={busy}
            aria-label="Refresh"
            disabled={busy}
          >
            <RefreshCw className={cn("!h-6 !w-6", busy && "animate-spin")} />
          </IconButton>
        </MainCardHeader>
        <div className="mx-4 mb-3 flex gap-2">
          {[
            { label: "All", value: "all" },
            { label: "Checked In", value: "check-in" },
            { label: "Checked Out", value: "check-out" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setEventType(opt.value as EventTypeFilter)}
              className={cn(
                "rounded border px-3 py-1 text-sm font-medium",
                eventType === opt.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground hover:bg-primary/10 border-transparent",
              )}
              disabled={busy}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <MainCardContent>
          {isLoading || !isLoaded ? (
            <CardLoadingSpinner />
          ) : error ? (
            <CardError text="Error loading check-ins." />
          ) : movements && movements.length ? (
            <CardList>
              {movements.map((v) => (
                <CardListItem
                  key={v.lastEventId}
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
                    lastMovementTime={v.lastMovementTime}
                    lastEventType={v.lastEventType}
                  />
                </CardListItem>
              ))}
            </CardList>
          ) : (
            <CardNoContent text={noContentMessage} />
          )}
        </MainCardContent>
        <MainCardFooter>
          <CardButton buttonText="View All" />
        </MainCardFooter>
      </MainCard>
    </>
  );
}
