// // app/api/search/route.ts
// import { NextResponse } from "next/server";
// import { z } from "zod";
// import { getServerSupabaseClient } from "@/lib/supabaseServer";
// import { auth } from "@clerk/nextjs/server";

// export const dynamic = "force-dynamic";
// export const runtime = "nodejs";

// const QuerySchema = z.object({
//   q: z.string().trim().min(2).max(64), // 2+ chars to query
//   limit: z.coerce.number().int().min(1).max(10).default(8),
// });

// function escapeIlike(input: string) {
//   // Escape %, _, and \ (wildcards) and commas (`,`) as they break Supabase `.or()` strings.
//   return input.replace(/([%_\\])/g, "\\$1").replace(/,/g, "\\,");
// }

// export async function GET(req: Request) {
//   const { userId, orgId } = await auth();
//   if (!userId || !orgId) {
//     return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
//   }

//   // Validate and normalise query params
//   const url = new URL(req.url);
//   const parsed = QuerySchema.safeParse({
//     q: url.searchParams.get("q") ?? "",
//     limit: url.searchParams.get("limit") ?? undefined,
//   });

//   if (!parsed.success) {
//     return NextResponse.json(
//       { error: "Invalid query", details: z.treeifyError(parsed.error) },
//       { status: 400 },
//     );
//   }

//   const { q, limit } = parsed.data;
//   const like = `%${escapeIlike(q)}%`;

//   const supabase = await getServerSupabaseClient();

//   // Vehicles search
//   const { data: vehicles, error: vehErr } = await supabase
//     .from("assets")
//     .select("id,identifier,make,model")
//     .eq("clerk_organisation_id", orgId)
//     .or(
//       [
//         `identifier.ilike.${like}`,
//         `make.ilike.${like}`,
//         `model.ilike.${like}`,
//       ].join(","),
//     )
//     // Prefer exact/starts-with matches first, then alpha by identifier
//     .order("identifier", { ascending: true, nullsFirst: false })
//     .limit(limit);

//   if (vehErr) {
//     return NextResponse.json({ error: vehErr.message }, { status: 500 });
//   }

//   // Clients search
//   const { data: clients, error: cliErr } = await supabase
//     .from("clients")
//     .select("id,first_name,last_name,company_name")
//     .eq("clerk_organisation_id", orgId)
//     .or(
//       [
//         `first_name.ilike.${like}`,
//         `last_name.ilike.${like}`,
//         `company_name.ilike.${like}`,
//       ].join(","),
//     )
//     .order("last_name", { ascending: true, nullsFirst: true })
//     .order("first_name", { ascending: true, nullsFirst: true })
//     .limit(limit);

//   if (cliErr) {
//     return NextResponse.json({ error: cliErr.message }, { status: 500 });
//   }

//   return NextResponse.json({
//     vehicles: vehicles ?? [],
//     clients: clients ?? [],
//   });
// }

// app/api/search/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabaseClient } from "@/lib/supabaseServer";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RawJoinedClient =
  | null
  | {
      id: string;
      first_name: string | null;
      last_name: string | null;
      company_name: string | null;
      deleted_at: string | null;
    }
  | Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      company_name: string | null;
      deleted_at: string | null;
    }>;

type RawVehicleRow = {
  id: string;
  identifier: string | null;
  make: string | null;
  model: string | null;
  client: RawJoinedClient; // may be object OR array OR null
};

const QuerySchema = z.object({
  q: z.string().trim().min(2).max(64),
  limit: z.coerce.number().int().min(1).max(10).default(8),
});

function escapeIlike(input: string) {
  return input.replace(/([%_\\])/g, "\\$1").replace(/,/g, "\\,");
}

function firstClient(c: RawJoinedClient) {
  if (Array.isArray(c)) return c[0] ?? null;
  return c ?? null;
}

export async function GET(req: Request) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    q: url.searchParams.get("q") ?? "",
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const { q, limit } = parsed.data;
  const like = `%${escapeIlike(q)}%`;
  const supabase = await getServerSupabaseClient();

  // 1) Find matching clients first (by name/company)
  const { data: matchingClients, error: cliErr } = await supabase
    .from("clients")
    .select("id")
    .eq("clerk_organisation_id", orgId)
    .is("deleted_at", null)
    .or(
      [
        `first_name.ilike.${like}`,
        `last_name.ilike.${like}`,
        `company_name.ilike.${like}`,
      ].join(","),
    )
    .limit(limit);
  if (cliErr) {
    return NextResponse.json({ error: cliErr.message }, { status: 500 });
  }
  const clientIds = (matchingClients ?? []).map((c) => c.id);

  // 2) Query vehicles by vehicle fields
  const vehQuery = supabase
    .from("assets")
    .select(
      `
        id, identifier, make, model,
        client:clients!assets_client_fk ( id, first_name, last_name, company_name, deleted_at )
      `,
    )
    .eq("clerk_organisation_id", orgId)
    .is("deleted_at", null)
    .or(
      [
        `identifier.ilike.${like}`,
        `make.ilike.${like}`,
        `model.ilike.${like}`,
      ].join(","),
    )
    .order("identifier", { ascending: true })
    .limit(limit);

  // 3) If any clients matched, fetch vehicles for those client_ids too
  //    (we'll merge & de-duplicate below)
  const [vehiclesBySelf, vehiclesByClient] = await Promise.all([
    vehQuery, // by identifier/make/model
    clientIds.length
      ? supabase
          .from("assets")
          .select(
            `
              id, identifier, make, model,
              client:clients!assets_client_fk ( id, first_name, last_name, company_name, deleted_at )
            `,
          )
          .eq("clerk_organisation_id", orgId)
          .is("deleted_at", null)
          .in("client_id", clientIds)
          .order("identifier", { ascending: true })
          .limit(limit)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const vehErr1 = vehiclesBySelf.error;
  const vehErr2 = vehiclesByClient.error ?? null;
  if (vehErr1 || vehErr2) {
    return NextResponse.json(
      { error: vehErr1?.message ?? vehErr2?.message ?? "Search failed" },
      { status: 500 },
    );
  }

  // 4) Merge & de-duplicate by vehicle id
  const merged = [
    ...(vehiclesBySelf.data ?? []),
    ...((vehiclesByClient.data ?? []) as RawVehicleRow[]),
  ] as RawVehicleRow[];

  const seen = new Set<string>();
  const vehiclesWithClient = merged
    .filter((row) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    })
    .slice(0, limit)
    .map((row) => {
      const c = firstClient(row.client);
      const safeClient =
        c && c.deleted_at == null
          ? {
              id: c.id,
              first_name: c.first_name,
              last_name: c.last_name,
              company_name: c.company_name,
            }
          : null;

      return {
        id: row.id,
        identifier: row.identifier ?? null,
        make: row.make ?? null,
        model: row.model ?? null,
        client: safeClient,
      };
    });

  // (Optional) also return clients list for other UIs; here we include the
  // top matches (already filtered by org & not deleted).
  const { data: clientsList } = await supabase
    .from("clients")
    .select("id, first_name, last_name, company_name")
    .eq("clerk_organisation_id", orgId)
    .is("deleted_at", null)
    .or(
      [
        `first_name.ilike.${like}`,
        `last_name.ilike.${like}`,
        `company_name.ilike.${like}`,
      ].join(","),
    )
    .order("last_name", { ascending: true, nullsFirst: true })
    .order("first_name", { ascending: true, nullsFirst: true })
    .limit(limit);

  return NextResponse.json({
    vehicles: vehiclesWithClient,
    clients: clientsList ?? [],
  });
}
