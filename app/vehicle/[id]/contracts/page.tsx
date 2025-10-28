import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSupabaseClient } from "@/lib/supabaseServer";
import { keysToCamelCase } from "@/utils/case";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { ContractForm } from "@/components/contracts/ContractForm";
import { SupabaseClient } from "@supabase/supabase-js";
import { createContractAction } from "@/lib/server-actions/contracts";
import { formatDateGb } from "@/lib/date/dateUtils";

type ContractRow = {
  id: string;
  assetId: string;
  clientId: string;
  monthlyRate: number;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  location:
    | { id: string; name: string | null }
    | { id: string; name: string | null }[]
    | null;
  zone:
    | { id: string; name: string | null; floor: string | null }
    | { id: string; name: string | null; floor: string | null }[]
    | null;
};

interface Vehicle {
  id: string;
  identifier: string | null;
  make?: string | null;
  model?: string | null;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    companyName?: string | null;
  } | null;
}

type RawVehicleRow = {
  id: string;
  identifier: string;
  make: string | null;
  model: string | null;
  client: Array<{
    id: string;
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
  }> | null;
};

async function getVehicleAndClient(
  supabase: SupabaseClient,
  id: string,
): Promise<Vehicle | null> {
  const { data, error } = await supabase
    .from("assets")
    .select(
      `
      id,
      identifier,
      make,
      model,
      client:clients ( id, first_name, last_name, company_name )`,
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle()
    .overrideTypes<RawVehicleRow, { merge: false }>();

  if (error || !data) return null;
  return keysToCamelCase(data) as Vehicle;
}

async function getContractsForAsset(
  supabase: SupabaseClient,
  assetId: string,
): Promise<ContractRow[]> {
  const { data, error } = await supabase
    .from("storage_contracts")
    .select(
      `
      id,
      assetId:asset_id,
      clientId:client_id,
      monthlyRate:monthly_rate,
      startDate:start_date,
      endDate:end_date,
      createdAt:created_at,
      updatedAt:updated_at,
      location:locations!storage_contracts_location_fk ( id, name ),
      zone:location_zones!storage_contracts_location_zone_fk ( id, name, floor )
    `,
    )
    .eq("asset_id", assetId)
    .is("deleted_at", null)
    .order("start_date", { ascending: false })
    .overrideTypes<ContractRow[], { merge: false }>();

  if (error) throw error;
  return data ?? [];
}

type LocationRow = {
  id: string;
  name: string;
  location_zones: { id: string; name: string; floor: string | null }[] | null;
};

async function getOrgLocations(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("locations")
    .select(
      `
      id, name,
      location_zones:location_zones!location_zones_location_fk ( id, name, floor )
    `,
    )
    .is("deleted_at", null)
    .order("name", { ascending: true })
    .order("name", { foreignTable: "location_zones", ascending: true });

  if (error) throw error;

  return (data ?? []).map((l: LocationRow) => ({
    id: l.id,
    name: l.name,
    zones: (l.location_zones ?? []).map((z) => ({
      id: z.id,
      name: z.name + (z.floor ? ` — ${z.floor}` : ""),
    })),
  })) as { id: string; name: string; zones: { id: string; name: string }[] }[];
}

export default async function VehicleContractsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getServerSupabaseClient();

  const vehicle = await getVehicleAndClient(supabase, id);
  if (!vehicle) return notFound();

  const contracts = await getContractsForAsset(supabase, id);
  const locations = await getOrgLocations(supabase);
  const now = new Date();
  const todayYmd = todayStrLondon(now); // "YYYY-MM-DD"
  const tomorrow = new Date(todayYmd); // midnight London interpreted as local; safe for date-only use
  tomorrow.setDate(tomorrow.getDate() + 1);
  const active = contracts.find((c) => isActiveToday(c, now));

  const scheduled = contracts
    .filter((c) => isScheduled(c, now))
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];

  const tomorrowYmd = todayStrLondon(tomorrow);
  const hasScheduled = Boolean(scheduled);
  const scheduledStartsTomorrow =
    !!scheduled && scheduled.startDate === tomorrowYmd;

  function todayStrLondon(d = new Date()) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(d)
      .reduce<Record<string, string>>((acc, p) => {
        if (p.type !== "literal") acc[p.type] = p.value;
        return acc;
      }, {});
    return `${parts.year}-${parts.month}-${parts.day}`; // YYYY-MM-DD
  }

  function isActiveToday(
    c: { startDate: string; endDate?: string | null },
    d = now,
  ) {
    const t = todayStrLondon(d);
    return c.startDate <= t && (!c.endDate || c.endDate >= t);
  }
  function startedToday(c: { startDate: string }, d = now) {
    return c.startDate === todayStrLondon(d);
  }
  function endsToday(c: { endDate?: string | null }, d = now) {
    const t = todayStrLondon(d);
    return !!c.endDate && c.endDate === t;
  }
  function hasEnded(c: { endDate?: string | null }, d = now) {
    const t = todayStrLondon(d);
    return !!c.endDate && c.endDate < t;
  }
  function isScheduled(c: { startDate: string }, d = now) {
    const t = todayStrLondon(d);
    return c.startDate > t;
  }

  return (
    <div className="flex min-h-[80vh] w-full flex-col items-center px-2 py-8">
      <div className="w-full max-w-3xl">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/inventory">Inventory</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/vehicle/${vehicle.id}`}>
                  {vehicle.identifier?.toUpperCase() ?? "-"}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Contracts</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Contracts</CardTitle>
            <CardDescription>
              {vehicle.make || vehicle.model ? (
                <span>
                  {vehicle.make} {vehicle.model} ·{" "}
                  <span className="uppercase">
                    {vehicle.identifier?.toUpperCase() ?? "-"}
                  </span>
                </span>
              ) : (
                <span className="uppercase">
                  {vehicle.identifier?.toUpperCase() ?? "-"}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Create-new section */}
            {active ? (
              endsToday(active) ? (
                <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
                  This vehicle has an{" "}
                  <span className="font-semibold">active</span> contract that
                  <span className="font-semibold"> ends today</span> (
                  {formatDateGb(active.endDate!)}
                  ).
                  <div className="text-muted-foreground mt-2">
                    {scheduledStartsTomorrow ? (
                      <>
                        A new contract is already scheduled to start{" "}
                        <span className="font-semibold">tomorrow</span>. You
                        don’t need to create another.
                      </>
                    ) : hasScheduled ? (
                      <>
                        A new contract is already scheduled to start on{" "}
                        {formatDateGb(scheduled!.startDate)}. You don’t need to
                        create another.
                      </>
                    ) : (
                      <>
                        You can schedule the next contract to start{" "}
                        <span className="font-semibold">tomorrow</span>.
                      </>
                    )}
                  </div>
                  {/* Only show the form if there is NO scheduled contract */}
                  {!hasScheduled && (
                    <div className="mt-3">
                      <div className="bg-card rounded-md border p-3">
                        <ContractForm
                          action={createContractAction}
                          assetId={vehicle.id}
                          clientId={vehicle.client?.id}
                          initialStartDate={tomorrow}
                          minStartDate={tomorrow}
                          locations={locations}
                        />
                      </div>
                    </div>
                  )}
                  {/* If there IS a scheduled contract, give a link to manage it */}
                  {hasScheduled && (
                    <div className="mt-3">
                      <Button asChild size="sm" variant="outline">
                        <Link
                          href={`/vehicle/${vehicle.id}/contracts/${scheduled!.id}`}
                        >
                          View / edit scheduled contract
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                // Active and not ending today → block creation
                <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
                  This vehicle has an{" "}
                  <span className="font-semibold">active</span> contract{" "}
                  {startedToday(active) ? (
                    <>
                      that <span className="font-semibold">started today</span>.
                    </>
                  ) : (
                    <>that started on {formatDateGb(active.startDate)}.</>
                  )}
                  {active.endDate && (
                    <> It ends on {formatDateGb(active.endDate)}.</>
                  )}
                  <br />
                  To start a new contract you will need to{" "}
                  <span className="font-semibold">
                    end the current one
                  </span>{" "}
                  first.
                  <div className="mt-2">
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={`/vehicle/${vehicle.id}/contracts/${active.id}`}
                      >
                        View & end current contract
                      </Link>
                    </Button>
                  </div>
                </div>
              )
            ) : hasScheduled ? (
              // No active, but a future contract is scheduled → tell them and hide create form
              <div className="mb-6 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
                A contract is <span className="font-semibold">scheduled</span>{" "}
                to start on {formatDateGb(scheduled!.startDate)}.
                <div className="text-muted-foreground mt-1">
                  You don’t need to create another. If needed, you can edit the
                  start date or cancel it.
                </div>
                <div className="mt-2">
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={`/vehicle/${vehicle.id}/contracts/${scheduled!.id}`}
                    >
                      View / edit scheduled contract
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              // No active and no scheduled → show create form
              <div className="mb-6">
                <h3 className="mb-2 text-sm font-semibold tracking-wide">
                  Create a contract
                </h3>
                <div className="bg-card rounded-md border p-3">
                  <ContractForm
                    action={createContractAction}
                    assetId={vehicle.id}
                    clientId={vehicle.client?.id}
                    locations={locations}
                  />
                </div>
              </div>
            )}

            <Separator className="my-4" />
            <h3 className="mb-2 text-sm font-semibold tracking-wide">
              All contracts
            </h3>
            {contracts.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                No contracts yet
              </div>
            ) : (
              <ul className="space-y-3">
                {contracts.map((c) => {
                  const activeNow = isActiveToday(c, now);
                  const loc = Array.isArray(c.location)
                    ? c.location[0]
                    : c.location;
                  const zn = Array.isArray(c.zone) ? c.zone[0] : c.zone;
                  return (
                    <li key={c.id} className="rounded border p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm">
                            <span className="font-medium">
                              £{Number(c.monthlyRate).toFixed(2)}
                            </span>{" "}
                            per month
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {formatDateGb(c.startDate)} →{" "}
                            {c.endDate ? formatDateGb(c.endDate) : "open-ended"}
                            {" · "}
                            {loc?.name ?? "Unassigned"}
                            {zn?.name
                              ? ` · ${zn.name}${zn.floor ? ` — ${zn.floor}` : ""}`
                              : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* BADGES */}
                          {isScheduled(c, now) && (
                            <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                              Scheduled
                            </span>
                          )}
                          {activeNow && !endsToday(c, now) && (
                            <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                              Active
                            </span>
                          )}
                          {endsToday(c, now) && (
                            <span className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                              Ends today
                            </span>
                          )}
                          {hasEnded(c, now) && (
                            <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                              Ended
                            </span>
                          )}

                          <Button asChild size="sm" variant="outline">
                            <Link
                              href={`/vehicle/${vehicle.id}/contracts/${c.id}`}
                            >
                              View
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
