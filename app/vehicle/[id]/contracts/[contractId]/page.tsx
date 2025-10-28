import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabaseClient } from "@/lib/supabaseServer";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { EndContractDialog } from "@/components/contracts/EndContractDialog";
import { SupabaseClient } from "@supabase/supabase-js";
import { CancelScheduledContractDialog } from "@/components/contracts/CancelScheduledContractDialog";

type ContractDetailRow = {
  id: string;
  asset_id: string;
  client_id: string;
  monthly_rate: number;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  location_id: string | null;
  location_zone_id: string | null;

  asset: {
    id: string;
    identifier: string | null;
    make: string | null;
    model: string | null;
  } | null;
  client: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
  } | null;
  location: { id: string; name: string | null } | null;
  zone: { id: string; name: string | null; floor: string | null } | null;
};

// --- date helpers (date-only, no TZ assumptions) ---
function todayStr(d = new Date()) {
  return d.toISOString().slice(0, 10);
}
function parseYmd(s: string) {
  return new Date(s + "T00:00:00");
}
function daysBetweenInclusive(aYmd: string, bYmd: string) {
  const a = parseYmd(aYmd);
  const b = parseYmd(bYmd);
  return Math.floor((b.getTime() - a.getTime()) / 86400000) + 1;
}
function daysUntil(aYmd: string, fromYmd: string) {
  return Math.ceil(
    (parseYmd(aYmd).getTime() - parseYmd(fromYmd).getTime()) / 86400000,
  );
}
function daysSince(aYmd: string, fromYmd: string) {
  return Math.floor(
    (parseYmd(fromYmd).getTime() - parseYmd(aYmd).getTime()) / 86400000,
  );
}

// --- status helpers (unchanged logic) ---
function isActiveToday(
  c: { startDate: string; endDate?: string | null },
  now = new Date(),
) {
  const t = todayStr(now);
  return c.startDate <= t && (!c.endDate || c.endDate >= t);
}
function isScheduled(c: { startDate: string }, now = new Date()) {
  const t = todayStr(now);
  return c.startDate > t;
}
function endsToday(c: { endDate?: string | null }, now = new Date()) {
  const t = todayStr(now);
  return !!c.endDate && c.endDate === t;
}
function hasEnded(c: { endDate?: string | null }, now = new Date()) {
  const t = todayStr(now);
  return !!c.endDate && c.endDate < t;
}

async function getContractWithJoins(
  supabase: SupabaseClient,
  contractId: string,
) {
  const { data, error } = await supabase
    .from("storage_contracts")
    .select(
      `
      id, asset_id, client_id, monthly_rate, start_date, end_date, created_at, updated_at,
      location_id, location_zone_id,

      asset:assets!storage_contracts_asset_fk (
        id, identifier, make, model
      ),
      client:clients!storage_contracts_client_fk (
        id, first_name, last_name, company_name
      ),
      location:locations!storage_contracts_location_fk (
        id, name
      ),
      zone:location_zones!storage_contracts_location_zone_fk (
        id, name, floor
      )
    `,
    )
    .eq("id", contractId)
    .is("deleted_at", null)
    .maybeSingle()
    .overrideTypes<ContractDetailRow, { merge: false }>();

  if (error || !data) return null;
  return data;
}

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string; contractId: string }>;
}) {
  const { id, contractId } = await params;
  const supabase = await getServerSupabaseClient();

  const row = await getContractWithJoins(supabase, contractId);
  if (!row) return notFound();

  // quick guards
  const vehicle = row.asset;
  if (!vehicle || vehicle.id !== id) return notFound();

  const contract = {
    id: row.id,
    assetId: row.asset_id,
    clientId: row.client_id,
    monthlyRate: row.monthly_rate,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  const client = row.client && {
    id: row.client.id,
    firstName: row.client.first_name,
    lastName: row.client.last_name,
    companyName: row.client.company_name,
  };

  const location = row.location && {
    id: row.location.id,
    name: row.location.name,
  };
  const zone = row.zone && {
    id: row.zone.id,
    name: row.zone.name,
    floor: row.zone.floor,
  };

  const activeNow = isActiveToday(contract);
  const scheduled = isScheduled(contract);
  const endingToday = endsToday(contract);
  const ended = hasEnded(contract);

  const today = todayStr();
  const startedDaysAgo =
    contract.startDate <= today
      ? daysSince(contract.startDate, today)
      : undefined;
  const startsIn = scheduled ? daysUntil(contract.startDate, today) : undefined;
  const totalDays = contract.endDate
    ? daysBetweenInclusive(contract.startDate, contract.endDate)
    : undefined;
  const daysRemaining =
    activeNow && contract.endDate
      ? daysBetweenInclusive(today, contract.endDate)
      : undefined;

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
              <BreadcrumbLink asChild>
                <Link href={`/vehicle/${vehicle.id}/contracts`}>Contracts</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Details</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Contract</CardTitle>
            <CardDescription>
              £{Number(contract.monthlyRate).toFixed(2)} / month ·{" "}
              {new Date(contract.startDate).toLocaleDateString("en-GB")} →{" "}
              {contract.endDate
                ? new Date(contract.endDate).toLocaleDateString("en-GB")
                : "open-ended"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* status badges + scheduled notice (unchanged behaviour) */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {scheduled && (
                <div className="mb-3 w-full rounded border border-blue-200 bg-blue-50 p-3 text-sm">
                  This contract is{" "}
                  <span className="font-semibold">scheduled</span> to start on{" "}
                  {new Date(contract.startDate).toLocaleDateString("en-GB")}.
                  <div className="text-muted-foreground mt-1">
                    If the date is wrong, cancel and create a new one with the
                    correct date.
                  </div>
                  <div className="mt-3">
                    <CancelScheduledContractDialog
                      contractId={contract.id}
                      assetId={vehicle.id}
                      triggerLabel="Cancel scheduled contract"
                    />
                  </div>
                </div>
              )}
              {activeNow && !endingToday && (
                <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                  Active
                </span>
              )}
              {endingToday && (
                <span className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                  Active · ends today
                </span>
              )}
              {ended && (
                <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                  Ended{" "}
                  {new Date(contract.endDate!).toLocaleDateString("en-GB")}
                </span>
              )}
            </div>

            {/* AT-A-GLANCE CARDS */}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Client */}
              <Card className="border-muted">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Client</CardTitle>
                  <CardDescription>
                    {client
                      ? (() => {
                          const person = [client.firstName, client.lastName]
                            .filter(Boolean)
                            .join(" ");
                          return client.companyName
                            ? person
                              ? `${person} (${client.companyName})`
                              : client.companyName
                            : person || "Unknown client";
                        })()
                      : "Unknown client"}
                  </CardDescription>
                </CardHeader>
              </Card>
              {/* Status & timing */}
              <Card className="border-muted">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Status & timing</CardTitle>
                  <CardDescription>
                    {scheduled && typeof startsIn === "number" && startsIn > 0
                      ? `Starts in ${startsIn} day${startsIn === 1 ? "" : "s"}`
                      : activeNow
                        ? contract.endDate && typeof daysRemaining === "number"
                          ? `Active · ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining`
                          : `Active · no end date`
                        : ended
                          ? `Ended`
                          : `Not active`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground text-xs">
                  <div>
                    Start:{" "}
                    {new Date(contract.startDate).toLocaleDateString("en-GB")}
                  </div>
                  <div>
                    End:{" "}
                    {contract.endDate
                      ? new Date(contract.endDate).toLocaleDateString("en-GB")
                      : "open-ended"}
                  </div>
                  {typeof startedDaysAgo === "number" &&
                    startedDaysAgo >= 0 && (
                      <div>
                        Started {startedDaysAgo} day
                        {startedDaysAgo === 1 ? "" : "s"} ago
                      </div>
                    )}
                  {typeof totalDays === "number" && totalDays > 0 && (
                    <div>
                      Period length: {totalDays} day{totalDays === 1 ? "" : "s"}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Billing & period */}
              <Card className="border-muted">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Billing & period</CardTitle>
                  <CardDescription>
                    Monthly rate: £{Number(contract.monthlyRate).toFixed(2)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground text-xs">
                  <div>
                    Period:{" "}
                    {new Date(contract.startDate).toLocaleDateString("en-GB")} →{" "}
                    {contract.endDate
                      ? new Date(contract.endDate).toLocaleDateString("en-GB")
                      : "open-ended"}
                  </div>
                  <div>
                    Created:{" "}
                    {new Date(contract.createdAt).toLocaleString("en-GB")}
                  </div>
                  <div>
                    Updated:{" "}
                    {new Date(contract.updatedAt).toLocaleString("en-GB")}
                  </div>
                </CardContent>
              </Card>
              {/* Location for this contract */}
              <Card className="border-muted">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Location</CardTitle>
                  <CardDescription>
                    {location?.name ?? "Unassigned"}
                    {zone?.name ? (
                      <>
                        {" · "}
                        {zone.name}
                        {zone.floor ? ` — ${zone.floor}` : ""}
                      </>
                    ) : null}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground text-xs">
                  {location?.name
                    ? "This is the storage location specified on the contract."
                    : "No location recorded on this contract."}
                </CardContent>
              </Card>

              {/* Vehicle */}
              <Card className="border-muted">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Vehicle</CardTitle>
                  <CardDescription className="uppercase">
                    {vehicle.identifier ?? "-"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground text-xs">
                  <div>
                    {vehicle.make || vehicle.model ? (
                      <>
                        {vehicle.make ?? ""} {vehicle.model ?? ""}
                      </>
                    ) : (
                      <>No make/model recorded</>
                    )}
                  </div>
                  <div className="mt-2">
                    <Link
                      className="underline underline-offset-4"
                      href={`/vehicle/${vehicle.id}`}
                    >
                      View vehicle
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator className="my-4" />
            <div className="mb-2 font-semibold">Actions</div>

            {scheduled && (
              <div className="mb-3 rounded border border-blue-200 bg-blue-50 p-3 text-sm">
                This contract is scheduled to start on{" "}
                <span className="font-semibold">
                  {new Date(contract.startDate).toLocaleDateString("en-GB")}
                </span>
                .
                <div className="text-muted-foreground mt-1">
                  If the date is wrong, edit or cancel this scheduled contract
                  instead of creating another.
                </div>
                <div className="mt-3 flex gap-2">
                  {/* reserved for future edit flow */}
                </div>
              </div>
            )}

            {activeNow && (
              <>
                <EndContractDialog
                  contractId={contract.id}
                  assetId={vehicle.id}
                  disabled={false}
                />
                {endingToday && (
                  <div className="text-muted-foreground mt-2 text-sm">
                    This contract remains active until the end of today. You can
                    schedule the next contract to start{" "}
                    <span className="font-semibold">tomorrow</span>.
                  </div>
                )}
              </>
            )}

            {ended && (
              <div className="text-muted-foreground text-sm">
                This contract ended on{" "}
                {new Date(contract.endDate!).toLocaleDateString("en-GB")}.
              </div>
            )}

            {!scheduled && !activeNow && !ended && (
              <div className="text-muted-foreground text-sm">
                No actions available.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
