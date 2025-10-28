// // app/api/assets/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { z } from "zod";
// import { auth } from "@clerk/nextjs/server";
// import { getServerSupabaseClient } from "@/lib/supabaseServer";
// import { keysToCamelCase } from "@/utils/case";

// export const runtime = "nodejs";
// export const dynamic = "force-dynamic"; // ensure no static caching for authed data

// const QuerySchema = z.object({
//   location: z.string().optional(), // "all" or a location_id
//   order: z.enum(["asc", "desc"]).default("desc"),
//   page: z.coerce.number().int().positive().default(1),
//   pageSize: z.coerce.number().int().min(1).max(100).default(9),
// });

// export async function GET(req: NextRequest) {
//   const { userId, orgId } = await auth();
//   if (!userId || !orgId) {
//     return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
//   }

//   const parsed = QuerySchema.safeParse(
//     Object.fromEntries(req.nextUrl.searchParams),
//   );
//   if (!parsed.success) {
//     return NextResponse.json(
//       { error: "Invalid query", details: z.treeifyError(parsed.error) },
//       { status: 400 },
//     );
//   }

//   const { location, order, page, pageSize } = parsed.data;

//   const sb = await getServerSupabaseClient();

//   // Select only what you actually render; add fields as needed
//   let query = sb
//     .from("assets")
//     .select(
//       `
//       id,
//       identifier,
//       make,
//       model,
//       colour,
//       year,
//       created_at,
//       location:locations ( name ),
//       client:clients ( label )
//     `,
//       { count: "exact" },
//     )
//     .eq("clerk_organisation_id", orgId)
//     .order("created_at", { ascending: order === "asc", nullsFirst: false })
//     .range((page - 1) * pageSize, page * pageSize - 1);

//   if (location && location !== "all") {
//     query = query.eq("location_id", location);
//   }

//   const { data, count, error } = await query;

//   if (error) {
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }

//   const total = count ?? 0;
//   const totalPages = Math.max(1, Math.ceil(total / pageSize));

//   return NextResponse.json({
//     assets: keysToCamelCase(data ?? []),
//     meta: {
//       page,
//       pageSize,
//       total,
//       totalPages,
//       order,
//       location: location ?? null,
//     },
//   });
// }

// app/api/assets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { getServerSupabaseClient } from "@/lib/supabaseServer";
import { keysToCamelCase } from "@/utils/case";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  location: z.string().optional(), // "all" or a location_id
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(9),
});

export async function GET(req: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const parsed = QuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const { location, order, page, pageSize } = parsed.data;
  const sb = await getServerSupabaseClient();

  // 1) Fetch paged assets
  let assetsQuery = sb
    .from("assets")
    .select(
      `
      id,
      identifier,
      make,
      model,
      colour,
      year,
      created_at,
      location:locations ( name ),
      client:clients ( label )
    `,
      { count: "exact" },
    )
    .eq("clerk_organisation_id", orgId)
    .is("deleted_at", null)
    .order("created_at", { ascending: order === "asc", nullsFirst: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (location && location !== "all") {
    assetsQuery = assetsQuery.eq("location_id", location);
  }

  const { data: assetRows, count, error: assetsError } = await assetsQuery;
  if (assetsError) {
    return NextResponse.json({ error: assetsError.message }, { status: 500 });
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const assets = assetRows ?? [];

  // 2) Fetch latest movement for these assets and index by asset_id
  let latestByAssetId: Record<
    string,
    {
      last_event_type: "check-in" | "check-out" | "transfer" | null;
      last_movement_time: string | null;
    }
  > = {};

  if (assets.length > 0) {
    const ids = assets.map((a) => a.id);

    // Use your materialised/latest view if you have it:
    // latest_asset_event_detailed should already exclude soft-deleted rows and pick newest by movement_time DESC, id DESC
    const { data: latestRows, error: latestErr } = await sb
      .from("latest_asset_event_detailed")
      .select("asset_id, last_event_type, last_movement_time")
      .in("asset_id", ids);

    if (latestErr) {
      return NextResponse.json({ error: latestErr.message }, { status: 500 });
    }

    latestByAssetId = Object.fromEntries(
      (latestRows ?? []).map((r) => [
        r.asset_id,
        {
          last_event_type: r.last_event_type ?? null,
          last_movement_time: r.last_movement_time ?? null,
        },
      ]),
    );
  }

  // 3) Merge and camelise
  const merged = assets.map((a) => {
    const latest = latestByAssetId[a.id] ?? {
      last_event_type: null,
      last_movement_time: null,
    };
    return {
      ...a,
      last_event_type: latest.last_event_type,
      last_movement_time: latest.last_movement_time,
    };
  });

  return NextResponse.json({
    assets: keysToCamelCase(merged),
    meta: {
      page,
      pageSize,
      total,
      totalPages,
      order,
      location: location ?? null,
    },
  });
}
