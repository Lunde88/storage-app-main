// import { NextRequest } from "next/server";
// import { headers as nextHeaders } from "next/headers";
// import { Webhook } from "svix";
// import { createClient } from "@supabase/supabase-js";

// export const runtime = "nodejs";
// export const dynamic = "force-dynamic";

// const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET!;
// const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// type OrgInfo = { id: string };
// type PublicUserData = {
//   user_id: string;
//   identifier?: string | null;
//   first_name?: string | null;
//   last_name?: string | null;
// };

// type BaseClerkEvent = {
//   instance_id: string;
// };

// type OrganizationMembershipCreatedEvent = BaseClerkEvent & {
//   type: "organizationMembership.created";
//   data: { organization: OrgInfo; public_user_data: PublicUserData };
// };

// type OrganizationMembershipDeletedEvent = BaseClerkEvent & {
//   type: "organizationMembership.deleted";
//   data: { organization: OrgInfo; public_user_data: PublicUserData };
// };

// type UserUpdatedEvent = BaseClerkEvent & {
//   type: "user.updated";
//   data: {
//     id: string;
//     first_name?: string | null;
//     last_name?: string | null;
//     username?: string | null;
//     email_addresses?: Array<{ email_address: string }>;
//   };
// };

// type ClerkWebhookEvent =
//   | OrganizationMembershipCreatedEvent
//   | OrganizationMembershipDeletedEvent
//   | UserUpdatedEvent;

// function displayName(pud: PublicUserData | null | undefined) {
//   const first = pud?.first_name ?? "";
//   const last = pud?.last_name ?? "";
//   const full = `${first} ${last}`.trim();
//   return full || pud?.identifier || "New user";
// }

// export async function POST(req: NextRequest) {
//   if (!WEBHOOK_SECRET) {
//     return new Response("Missing CLERK_WEBHOOK_SECRET", { status: 500 });
//   }

//   // 1) Read raw body (required by Svix)
//   const payload = await req.text();

//   // 2) Verify signature
//   let evt: ClerkWebhookEvent;
//   try {
//     const hdrs = await nextHeaders(); // no await
//     const svixId = hdrs.get("svix-id");
//     const svixTimestamp = hdrs.get("svix-timestamp");
//     const svixSignature = hdrs.get("svix-signature");
//     if (!svixId || !svixTimestamp || !svixSignature) {
//       return new Response("Missing Svix headers", { status: 400 });
//     }

//     const wh = new Webhook(WEBHOOK_SECRET);
//     evt = wh.verify(payload, {
//       "svix-id": svixId,
//       "svix-timestamp": svixTimestamp,
//       "svix-signature": svixSignature,
//     }) as ClerkWebhookEvent;

//     // Instance guard
//     if (evt.instance_id !== process.env.CLERK_INSTANCE_ID) {
//       return new Response("Wrong instance", { status: 200 });
//     }

//     // Replay protection (deduplication)
//     const { error: dedupeErr } = await sb
//       .from("webhook_events")
//       .insert({ svix_id: svixId, event_type: evt.type });

//     if (dedupeErr?.code === "23505") {
//       return new Response("Duplicate", { status: 200 });
//     }
//     if (dedupeErr) {
//       return new Response("handler error", { status: 500 });
//     }
//   } catch (err) {
//     // Only signature problems should land here
//     console.error("Clerk webhook signature error:", err);
//     return new Response("Invalid signature", { status: 400 });
//   }

//   // 3) Handle the event (separate try/catch)
//   try {
//     switch (evt.type) {
//       case "organizationMembership.created": {
//         const orgId = evt.data.organization.id;
//         const pud = evt.data.public_user_data;
//         const clerkUserId = pud.user_id;
//         const email = pud.identifier ?? null;

//         if (email) {
//           const { data: reserved, error: rErr } = await sb
//             .from("users")
//             .select("id")
//             .eq("email", email)
//             .eq("clerk_organisation_id", orgId)
//             .is("deleted_at", null)
//             .maybeSingle();
//           if (rErr) throw rErr;

//           if (reserved) {
//             const { error: uErr } = await sb
//               .from("users")
//               .update({ clerk_user_id: clerkUserId })
//               .eq("id", reserved.id);
//             if (uErr) throw uErr;
//           } else {
//             // If you DO have a composite unique constraint, you can use onConflict with its name.
//             const { error: iErr } = await sb.from("users").insert({
//               full_name: displayName(pud),
//               label: displayName(pud),
//               email,
//               role: "staff",
//               assigned_location_ids: null,
//               clerk_organisation_id: orgId,
//               clerk_user_id: clerkUserId,
//             });
//             if (iErr) throw iErr;
//           }
//         } else {
//           const { error: iErr } = await sb.from("users").insert({
//             full_name: displayName(pud),
//             label: displayName(pud),
//             email: null,
//             role: "staff",
//             assigned_location_ids: null,
//             clerk_organisation_id: orgId,
//             clerk_user_id: clerkUserId,
//           });
//           if (iErr) throw iErr;
//         }
//         break;
//       }

//       case "organizationMembership.deleted": {
//         const orgId = evt.data.organization.id;
//         const clerkUserId = evt.data.public_user_data.user_id;
//         const { error: dErr } = await sb
//           .from("users")
//           .update({ deleted_at: new Date().toISOString() })
//           .eq("clerk_user_id", clerkUserId)
//           .eq("clerk_organisation_id", orgId)
//           .is("deleted_at", null);
//         if (dErr) throw dErr;
//         break;
//       }

//       case "user.updated": {
//         const u = evt.data;
//         const clerkUserId = u.id;
//         const email = u.email_addresses?.[0]?.email_address ?? null;
//         const fullName =
//           [u.first_name, u.last_name].filter(Boolean).join(" ") ||
//           u.username ||
//           email ||
//           null;

//         const { error: upErr } = await sb
//           .from("users")
//           .update({
//             full_name: fullName ?? undefined,
//             label: fullName ?? email ?? undefined,
//             email: email ?? undefined,
//           })
//           .eq("clerk_user_id", clerkUserId)
//           .is("deleted_at", null);
//         if (upErr) throw upErr;
//         break;
//       }

//       default:
//         // Unknown/ignored events should still 200
//         return new Response("ignored", { status: 200 });
//     }

//     // Handling succeeded
//     return new Response("ok", { status: 200 });
//   } catch (err) {
//     // Actual handler error (DB, logic, etc.)
//     console.error("Clerk webhook handler error:", err);
//     // Choose: 200 to *not* retry, or 500 to have Clerk retry
//     return new Response("handler error", { status: 500 });
//   }
// }

import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { Webhook } from "svix";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type OrgInfo = { id: string };
type PublicUserData = {
  user_id: string;
  identifier?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

type BaseClerkEvent = { instance_id: string };

type OrganizationMembershipCreatedEvent = BaseClerkEvent & {
  type: "organizationMembership.created";
  data: { organization: OrgInfo; public_user_data: PublicUserData };
};

type OrganizationMembershipDeletedEvent = BaseClerkEvent & {
  type: "organizationMembership.deleted";
  data: { organization: OrgInfo; public_user_data: PublicUserData };
};
type UserCreatedEvent = BaseClerkEvent & {
  type: "user.created";
  data: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
    email_addresses?: Array<{ email_address: string }>;
  };
};

type UserUpdatedEvent = BaseClerkEvent & {
  type: "user.updated";
  data: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
    email_addresses?: Array<{ email_address: string }>;
  };
};

type ClerkWebhookEvent =
  | OrganizationMembershipCreatedEvent
  | OrganizationMembershipDeletedEvent
  | UserUpdatedEvent
  | UserCreatedEvent;

/** Ensure a public.users row exists and return its UUID (users.id). */
async function ensureDbUserAndGetUuid(opts: {
  orgId: string;
  clerkUserId: string;
  fullName?: string | null; // ignored for updates
  email?: string | null;
}): Promise<string> {
  const { orgId, clerkUserId } = opts;
  const email = opts.email?.toLowerCase() || undefined;

  // Inserts only: choose a conservative default (or set to null if you prefer)
  const nameForInsert = "New user";
  const labelForInsert = email ?? nameForInsert;

  // 1) Match by (org, clerk_user_id) → revive + keep email fresh
  {
    const { data: row, error } = await sb
      .from("users")
      .select("id")
      .eq("clerk_organisation_id", orgId)
      .eq("clerk_user_id", clerkUserId)
      .maybeSingle();
    if (error) throw error;

    if (row?.id) {
      const patch: Record<string, unknown> = { deleted_at: null };
      if (email) patch.email = email; // do NOT touch full_name/label
      const { data: upd, error: updErr } = await sb
        .from("users")
        .update(patch)
        .eq("id", row.id)
        .select("id")
        .single();
      if (updErr) throw updErr;
      return upd.id as string;
    }
  }

  // 2) Match by (org, email) and link if not already linked → do NOT touch name/label
  if (email) {
    const { data: row, error } = await sb
      .from("users")
      .select("id, clerk_user_id")
      .eq("clerk_organisation_id", orgId)
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;

    if (row?.id && (!row.clerk_user_id || row.clerk_user_id === clerkUserId)) {
      const patch: Record<string, unknown> = {
        clerk_user_id: clerkUserId,
        deleted_at: null,
      };
      // keep email (normalised) if we got one
      patch.email = email;

      const { data: linked, error: linkErr } = await sb
        .from("users")
        .update(patch)
        .eq("id", row.id)
        .select("id")
        .single();
      if (linkErr) throw linkErr;
      return linked.id as string;
    }
  }

  // 3) Insert fresh (only place names/label are set)
  const { data: inserted, error: insErr } = await sb
    .from("users")
    .insert({
      full_name: nameForInsert,
      label: labelForInsert,
      email: email ?? null,
      role: "staff",
      assigned_location_ids: null,
      clerk_organisation_id: orgId,
      clerk_user_id: clerkUserId,
      deleted_at: null,
    })
    .select("id")
    .single();
  if (insErr) throw insErr;
  return inserted.id as string;
}

export async function POST(req: NextRequest) {
  if (!WEBHOOK_SECRET) {
    return new Response("Missing CLERK_WEBHOOK_SECRET", { status: 500 });
  }

  // Read raw body first (Svix needs the raw text)
  const payload = await req.text();

  // ✅ headers() is sync — no await
  const hdrs = await headers();
  const svixId = hdrs.get("svix-id");
  const svixTimestamp = hdrs.get("svix-timestamp");
  const svixSignature = hdrs.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing Svix headers", { status: 400 });
  }

  // Verify signature (throws if invalid)
  let evt: ClerkWebhookEvent;
  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    evt = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;

    if (evt.instance_id !== process.env.CLERK_INSTANCE_ID) {
      return new Response("Wrong instance", { status: 200 });
    }

    // Deduplicate by svix_id (ensure table has svix_id primary key)
    const { error: dedupeErr } = await sb
      .from("webhook_events")
      .insert({ svix_id: svixId, event_type: evt.type });
    if (dedupeErr?.code === "23505")
      return new Response("Duplicate", { status: 200 });
    if (dedupeErr) return new Response("handler error", { status: 500 });
  } catch (err) {
    console.error("Clerk webhook signature error:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  // Handle the event
  try {
    switch (evt.type) {
      case "organizationMembership.created": {
        const orgId = evt.data.organization.id;
        const pud = evt.data.public_user_data;
        const clerkUserId = pud.user_id;
        const email = pud.identifier?.toLowerCase() || undefined;

        await ensureDbUserAndGetUuid({
          orgId,
          clerkUserId,
          email, // used only for matching/linking
          // fullName: ignored on updates; omitted here for clarity
        });

        break;
      }

      case "organizationMembership.deleted": {
        const orgId = evt.data.organization.id;
        const clerkUserId = evt.data.public_user_data.user_id;
        const { error } = await sb
          .from("users")
          .update({ deleted_at: new Date().toISOString() })
          .eq("clerk_user_id", clerkUserId)
          .eq("clerk_organisation_id", orgId)
          .is("deleted_at", null);
        if (error) throw error;
        break;
      }

      case "user.created": {
        const u = evt.data;
        const clerkUserId = u.id;
        const email =
          u.email_addresses?.[0]?.email_address?.toLowerCase() ?? null;

        if (email) {
          const { error } = await sb
            .from("users")
            .update({ email })
            .eq("clerk_user_id", clerkUserId)
            .is("deleted_at", null);
          if (error) throw error;
        }
        break;
      }

      // Keep email fresh; DO NOT touch full_name or label
      case "user.updated": {
        const u = evt.data;
        const clerkUserId = u.id;
        const email =
          u.email_addresses?.[0]?.email_address?.toLowerCase() ?? null;

        if (email) {
          const { error } = await sb
            .from("users")
            .update({ email })
            .eq("clerk_user_id", clerkUserId)
            .is("deleted_at", null);
          if (error) throw error;
        }
        break;
      }

      default:
        return new Response("ignored", { status: 200 });
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("Clerk webhook handler error:", err);
    return new Response("handler error", { status: 500 });
  }
}
