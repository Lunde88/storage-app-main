// app/api/lookup-vehicle/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { sanitiseRegNumber, isValidRegNumber } from "@/lib/vesUtils";
import { fetchVehicleDetails } from "@/lib/data-fetching/fetchVehicleDetails";
import { ratelimit } from "@/lib/ratelimit";

export const runtime = "nodejs"; // keep Node if fetchVehicleDetails uses Node libs

const BodySchema = z.object({
  registrationNumber: z.string().min(1).max(32),
});

function getClientIp(req: NextRequest): string {
  // Vercel / proxies
  const xfwd = req.headers.get("x-forwarded-for");
  if (xfwd) return xfwd.split(",")[0].trim();
  // Fallback (dev)
  return "unknown";
}

export async function POST(req: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json(
      { error: "Unauthorised", code: "UNAUTHORISED" },
      { status: 401 },
    );
  }

  // Rate limit per org+user (or IP if you prefer)
  const identifier = `${orgId}:${userId}:${getClientIp(req)}`;
  const { success } = await ratelimit.limit(identifier);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests", code: "RATE_LIMIT" },
      { status: 429 },
    );
  }

  // Parse and validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", code: "BAD_JSON" },
      { status: 400 },
    );
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid body",
        code: "BAD_REQUEST",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const cleanReg = sanitiseRegNumber(parsed.data.registrationNumber);
  if (!isValidRegNumber(cleanReg)) {
    return NextResponse.json(
      { error: "Invalid registration number", code: "BAD_REG" },
      { status: 400 },
    );
  }

  // Add a timeout to the external lookup
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12_000); // 12s budget
  try {
    const details = await fetchVehicleDetails(cleanReg, {
      signal: ctrl.signal,
    });
    if (!details) {
      return NextResponse.json(
        { error: "Vehicle not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }
    return NextResponse.json(details, { status: 200 });
  } catch (err) {
    // Distinguish timeout/abort
    if ((err as Error).name === "AbortError") {
      return NextResponse.json(
        { error: "Upstream timeout", code: "UPSTREAM_TIMEOUT" },
        { status: 504 },
      );
    }
    console.error("[lookup-vehicle] error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL" },
      { status: 500 },
    );
  } finally {
    clearTimeout(t);
  }
}
