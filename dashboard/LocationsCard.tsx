"use client";
import { useClerkSupabaseClient } from "@/lib/supabaseClient";
import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";

import { LocationEdit, MapPin } from "lucide-react";

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
import LocationListItemContent from "../locations/LocationListItemContent";
import { fetchLocationsStatus } from "@/lib/data-fetching/fetchLocationsStatus";

export default function LocationsCard() {
  const { isLoaded, isSignedIn } = useAuth();
  const supabase = useClerkSupabaseClient();

  // Only start fetching when Clerk is loaded and signed in
  const shouldFetch = isLoaded && isSignedIn && !!supabase;

  const {
    data: locations,
    isLoading,
    error,
  } = useSWR(shouldFetch ? "locations-status" : null, () =>
    fetchLocationsStatus(supabase),
  );

  return (
    <>
      <MainCard>
        <MainCardHeader title="Locations" icon={<MapPin />}>
          <IconButton>
            <LocationEdit className="!h-6 !w-6" />
          </IconButton>
        </MainCardHeader>

        <MainCardContent>
          {isLoading || !isLoaded ? (
            <CardLoadingSpinner />
          ) : error ? (
            <CardError text="Error loading locations." />
          ) : locations && locations.length ? (
            <CardList>
              {locations.map((v) => (
                <CardListItem
                  bgTransparent
                  href={`/inventory?location=${v.locationId}`}
                  key={v.locationId}
                >
                  <LocationListItemContent
                    label={v.label ?? v.name}
                    capacity={v.capacity}
                    spacesAvailable={v.spacesAvailable}
                    occupied={v.occupied}
                  />
                </CardListItem>
              ))}
            </CardList>
          ) : (
            <CardNoContent text="No locations added yet. Start by adding your locations." />
          )}
        </MainCardContent>
        <MainCardFooter>
          <CardButton buttonText="Bookings" />
        </MainCardFooter>
      </MainCard>
    </>
  );
}
