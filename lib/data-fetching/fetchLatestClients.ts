// import { SupabaseClient } from "@supabase/supabase-js";

// import { DashboardClient } from "../types";

// export async function fetchLatestClients(
//   supabase: SupabaseClient,
//   limit = 3,
// ): Promise<DashboardClient[]> {
//   const { data, error } = await supabase
//     .from("clients")
//     .select(
//       `
//       id,
//       first_name,
//       last_name,
//       created_at,
//       assets:assets(id)

//     `,
//     )
//     .is("deleted_at", null)
//     .order("created_at", { ascending: false })
//     .limit(limit);

//   if (error) throw error;

//   return (data ?? []).map((row) => ({
//     id: row.id,
//     firstName: row.first_name,
//     lastName: row.last_name,
//     createdAt: row.created_at,
//     vehicleCount: row.assets?.length ?? 0, // count client-side
//   }));
// }

// lib/data-fetching/fetchLatestClients.ts
import { SupabaseClient } from "@supabase/supabase-js";
import { ymdLocal } from "../date/ymdLocal";

// What the card needs
export type LatestClientRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;

  vehicleCount: number;
  checkedInCount: number;

  activeContractCount: number;
  activeContractMonthlyTotal: number; // GBP

  services: string[]; // e.g. ['valet', 'charging', 'cover', 'MOT', 'service']
};

type ValetingOption = "not-requested" | "basic" | "enhanced" | "full" | string;

type StorageDetails = {
  tagNumber?: string | null;
  cover?: string | null;
  charger?: string | null;
  valeting?: ValetingOption | null;
  motRequired?: boolean | null;
  motDate?: string | null;
  serviceRequired?: boolean | null;
  serviceDate?: string | null;
};

type MovementRow = {
  asset_id: string;
  event_type: "check-in" | "check-out" | "transfer";
  storage_details: StorageDetails | null;
};

const asNumber = (x: unknown) => Number(x ?? 0);

export async function fetchLatestClients(
  supabase: SupabaseClient,
): Promise<LatestClientRow[]> {
  // 1) Last 8 clients
  const { data: clients, error: clientsErr } = await supabase
    .from("clients")
    .select("id, first_name, last_name, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(5);

  if (clientsErr) throw clientsErr;
  const clientIds = (clients ?? []).map((c) => c.id);
  if (clientIds.length === 0) return [];

  // 2) Assets by these clients
  const { data: assets, error: assetsErr } = await supabase
    .from("assets")
    .select("id, client_id")
    .in("client_id", clientIds)
    .is("deleted_at", null);

  if (assetsErr) throw assetsErr;
  const assetIds = (assets ?? []).map((a) => a.id);

  // Vehicle counts per client
  const vehicleCountByClient = new Map<string, number>();
  (assets ?? []).forEach((a) => {
    vehicleCountByClient.set(
      a.client_id,
      (vehicleCountByClient.get(a.client_id) ?? 0) + 1,
    );
  });

  // 3) Active contracts today: count + monthly total per client
  const today = ymdLocal();
  const { data: contracts, error: contractsErr } = await supabase
    .from("storage_contracts")
    .select("client_id, start_date, end_date, monthly_rate")
    .in("client_id", clientIds)
    .is("deleted_at", null)
    .lte("start_date", today)
    .or(`end_date.is.null,end_date.gte.${today}`);

  if (contractsErr) throw contractsErr;

  const activeContractCountByClient = new Map<string, number>();
  const activeContractMonthlyByClient = new Map<string, number>();
  (contracts ?? []).forEach((c) => {
    activeContractCountByClient.set(
      c.client_id,
      (activeContractCountByClient.get(c.client_id) ?? 0) + 1,
    );
    activeContractMonthlyByClient.set(
      c.client_id,
      (activeContractMonthlyByClient.get(c.client_id) ?? 0) +
        asNumber(c.monthly_rate),
    );
  });

  // 4) Latest movement per asset (to decide checked-in and pick services)
  //    We fetch movements for relevant assets, newest first, then keep the first seen per asset_id.
  const latestByAsset = new Map<
    string,
    {
      eventType: MovementRow["event_type"];
      storageDetails: StorageDetails | null;
    }
  >();

  if (assetIds.length > 0) {
    const { data: movs, error: movsErr } = await supabase
      .from("asset_movements")
      .select("asset_id, event_type, storage_details, deleted_at")
      .in("asset_id", assetIds)
      .is("deleted_at", null)
      .order("movement_time", { ascending: false });

    if (movsErr) throw movsErr;

    // Keep the newest per asset_id
    for (const m of (movs ?? []) as MovementRow[]) {
      if (!latestByAsset.has(m.asset_id)) {
        latestByAsset.set(m.asset_id, {
          eventType: m.event_type,
          storageDetails: m.storage_details ?? null,
        });
      }
    }
  }

  // Reduce to checked-in counts + services per client
  const checkedInCountByClient = new Map<string, number>();
  const servicesByClient = new Map<string, Set<string>>();

  (assets ?? []).forEach((a) => {
    const latest = latestByAsset.get(a.id);
    if (!latest) return;

    const isCheckedIn = latest.eventType === "check-in";
    if (!isCheckedIn) return;

    checkedInCountByClient.set(
      a.client_id,
      (checkedInCountByClient.get(a.client_id) ?? 0) + 1,
    );

    const sd = latest.storageDetails;
    const svc = servicesByClient.get(a.client_id) ?? new Set<string>();

    if (sd?.valeting && sd.valeting !== "not-requested") svc.add("valet");
    if (sd?.charger) svc.add("charging");
    if (sd?.cover) svc.add("cover");
    if (sd?.motRequired) svc.add("MOT");
    if (sd?.serviceRequired) svc.add("service");

    servicesByClient.set(a.client_id, svc);
  });

  // 5) Build final
  return (clients ?? []).map((c) => ({
    id: c.id,
    firstName: c.first_name,
    lastName: c.last_name,

    vehicleCount: vehicleCountByClient.get(c.id) ?? 0,
    checkedInCount: checkedInCountByClient.get(c.id) ?? 0,

    activeContractCount: activeContractCountByClient.get(c.id) ?? 0,
    activeContractMonthlyTotal: activeContractMonthlyByClient.get(c.id) ?? 0,

    services: Array.from(servicesByClient.get(c.id) ?? []),
  }));
}
