"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabaseClient } from "@/lib/supabaseServer";
import { UiUser } from "@/components/settings/UsersManager";

type MinimalReturn = {
  returning?: "minimal" | "representation";
  count?: "exact" | "planned" | "estimated";
};

// Keep this in sync with your DB CHECK constraint
export type UserRole = "admin" | "manager" | "staff";

export type UserInput = {
  fullName: string;
  email: string;
  role: UserRole;
  assignedLocationIds?: string[] | null; // uuid[]
};

type OrgUserRow = {
  id: string;
  role: UserRole;
  clerk_organisation_id: string;
};

// ── helpers  ──
async function getActor(
  sb: SupabaseClient,
  orgId: string,
  userId: string,
): Promise<OrgUserRow> {
  const { data: me, error } = await sb
    .from("users")
    .select("id, role, clerk_organisation_id")
    .eq("clerk_user_id", userId)
    .eq("clerk_organisation_id", orgId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !me) throw new Error("Your user record was not found.");
  return me as OrgUserRow;
}

async function requireAdmin(
  sb: SupabaseClient,
  orgId: string,
  userId: string,
): Promise<OrgUserRow> {
  const me = await getActor(sb, orgId, userId);
  if (me.role !== "admin") throw new Error("Only admins can manage users.");
  return me;
}

async function countOtherAdmins(
  sb: SupabaseClient,
  orgId: string,
  exceptId?: string,
): Promise<number> {
  let q = sb
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("clerk_organisation_id", orgId)
    .is("deleted_at", null)
    .eq("role", "admin");
  if (exceptId) q = q.neq("id", exceptId);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

export async function listUsersForOrg() {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authorised");
  const sb = await getServerSupabaseClient();

  const { data: users, error } = await sb
    .from("users")
    .select(
      "id, full_name, label, email, role, assigned_location_ids, clerk_user_id, created_at, updated_at",
    )
    .eq("clerk_organisation_id", orgId)
    .is("deleted_at", null)
    .order("full_name", { ascending: true });

  if (error) throw error;

  // Pull all PENDING org invites from Clerk
  const clerk = await clerkClient();

  const { data: invites } =
    await clerk.organizations.getOrganizationInvitationList({
      organizationId: orgId,
      status: ["pending"],
    });

  const pendingEmails = new Set(
    (invites ?? [])
      .map((i) => i.emailAddress?.toLowerCase())
      .filter(Boolean) as string[],
  );

  // Pull current members of the org once; build a set of member userIds
  const { data: membersNow } =
    await clerk.organizations.getOrganizationMembershipList({
      organizationId: orgId,
    });

  const memberUserIds = new Set(
    (membersNow ?? [])
      .map((m) => m.publicUserData?.userId)
      .filter(Boolean) as string[],
  );

  // Tag each user: pending if (NOT currently a member) AND (their email has a pending invite)
  return (users ?? []).map((u) => {
    const emailLc = (u.email ?? "").toLowerCase();
    // “Member” = the user’s Clerk userId is currently in the org
    const isMember = !!u.clerk_user_id && memberUserIds.has(u.clerk_user_id);
    // Show chip only if not a member and their email has a pending invite
    const invitePending = !isMember && !!emailLc && pendingEmails.has(emailLc);
    return { ...u, invitePending };
  });
}

export async function listOrgLocations() {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authorised");
  const sb = await getServerSupabaseClient();

  const { data, error } = await sb
    .from("locations")
    .select("id, name")
    .eq("clerk_organisation_id", orgId)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

async function removeFromClerkOrg(opts: {
  orgId: string;
  requestingUserId: string; // acting admin (from auth())
  clerkUserId?: string | null;
  email?: string | null;
}): Promise<boolean> {
  const clerk = await clerkClient();
  const email = opts.email?.toLowerCase();
  let userId = opts.clerkUserId ?? undefined;
  let didSomething = false;

  console.log(
    "[removeFromClerkOrg] orgId=%s reqUser=%s clerkUserId=%s email=%s",
    opts.orgId,
    opts.requestingUserId,
    opts.clerkUserId,
    email,
  );

  // Resolve userId from email if missing
  if (!userId && email) {
    try {
      const { data: users } = await clerk.users.getUserList({
        emailAddress: [email],
        limit: 3,
      });
      userId = users?.[0]?.id;
      console.log("[removeFromClerkOrg] resolved userId from email:", userId);
    } catch (e) {
      console.error("[removeFromClerkOrg] users.getUserList failed:", e);
    }
  }

  // Delete membership by userId (only if actually in this org)
  if (userId) {
    try {
      const { data: before } =
        await clerk.organizations.getOrganizationMembershipList({
          organizationId: opts.orgId,
          userId: [userId],
        });
      const countBefore = before?.length ?? 0;
      console.log(
        "[removeFromClerkOrg] memberships before:",
        countBefore,
        before?.map((m) => m.id),
      );

      if (countBefore > 0) {
        await clerk.organizations.deleteOrganizationMembership({
          organizationId: opts.orgId,
          userId,
        });

        const { data: after } =
          await clerk.organizations.getOrganizationMembershipList({
            organizationId: opts.orgId,
            userId: [userId],
          });
        const countAfter = after?.length ?? 0;
        console.log("[removeFromClerkOrg] memberships after:", countAfter);

        if (countAfter < countBefore) {
          didSomething = true;
        } else if (countAfter > 0) {
          console.warn(
            "[removeFromClerkOrg] still a member after delete attempt",
          );
        }
      } else {
        console.log(
          "[removeFromClerkOrg] user not a member of this org (skip delete)",
        );
      }
    } catch (e: unknown) {
      const err = e as { status?: number; [key: string]: unknown };
      if (err.status !== 404) {
        console.error("[removeFromClerkOrg] delete by userId failed:", err);
      }
    }
  }

  // Fallback: delete any memberships that match email (covers duplicate Clerk accounts)
  if (!didSomething && email) {
    try {
      const { data: byEmail } =
        await clerk.organizations.getOrganizationMembershipList({
          organizationId: opts.orgId,
          emailAddress: [email],
        });
      const targets = (byEmail ?? [])
        .map((m) => m.publicUserData?.userId)
        .filter((id): id is string => !!id);

      console.log(
        "[removeFromClerkOrg] email-based memberships:",
        targets.length,
      );

      if (targets.length > 0) {
        const results = await Promise.allSettled(
          targets.map((id) =>
            clerk.organizations.deleteOrganizationMembership({
              organizationId: opts.orgId,
              userId: id,
            }),
          ),
        );
        if (results.some((r) => r.status === "fulfilled")) didSomething = true;
      }
    } catch (e) {
      console.error("[removeFromClerkOrg] delete by email failed:", e);
    }
  }

  // Revoke pending invites (if any)
  if (email) {
    try {
      const { data: invites } =
        await clerk.organizations.getOrganizationInvitationList({
          organizationId: opts.orgId,
          status: ["pending"],
        });
      const mine = (invites ?? []).filter(
        (i) => i.emailAddress?.toLowerCase() === email,
      );
      console.log(
        "[removeFromClerkOrg] pending invites for email:",
        mine.length,
      );

      if (mine.length) {
        const results = await Promise.allSettled(
          mine.map((i) =>
            clerk.organizations.revokeOrganizationInvitation({
              organizationId: opts.orgId,
              invitationId: i.id,
              requestingUserId: opts.requestingUserId,
            }),
          ),
        );
        if (results.some((r) => r.status === "fulfilled")) didSomething = true;
      }
    } catch (e) {
      console.error("[removeFromClerkOrg] revokeInvitation failed:", e);
    }
  }

  return didSomething;
}

// ── actions  ──
export async function createUserForOrg(input: UserInput): Promise<UiUser> {
  const { orgId, userId } = await auth();
  if (!orgId || !userId) throw new Error("Not authorised");

  const sb = await getServerSupabaseClient();
  await requireAdmin(sb, orgId, userId);

  const emailLc = input.email.trim().toLowerCase();
  const label = input.fullName || emailLc;

  // 1) Upsert (revive if exists)
  const payload = {
    full_name: input.fullName,
    label,
    email: emailLc,
    role: input.role,
    assigned_location_ids: input.assignedLocationIds ?? null,
    clerk_organisation_id: orgId,
    deleted_at: null, // ensure undelete on conflict
  };

  const { error: upErr } = await sb
    .from("users")
    .upsert(payload, { onConflict: "email,clerk_organisation_id" });
  if (upErr) throw upErr;

  // 2) Fresh read (now non-deleted so SELECT RLS passes)
  const { data: row, error: selErr } = await sb
    .from("users")
    .select(
      "id, full_name, label, email, role, assigned_location_ids, clerk_user_id, created_at, updated_at",
    )
    .eq("email", emailLc)
    .eq("clerk_organisation_id", orgId)
    .is("deleted_at", null)
    .single();
  if (selErr || !row) throw selErr ?? new Error("User not found after upsert");

  // 3) Clerk membership / invite
  const clerk = await clerkClient();

  // Are they already a member of this org (by email)?
  const memberships = await clerk.organizations.getOrganizationMembershipList({
    organizationId: orgId,
    emailAddress: [emailLc],
  });
  const isMember = (memberships.data?.length ?? 0) > 0;

  let invitePending = false;
  if (!isMember) {
    const invites = await clerk.organizations.getOrganizationInvitationList({
      organizationId: orgId,
      status: ["pending"],
    });
    const alreadyPending = invites.data?.some(
      (i) => i.emailAddress?.toLowerCase() === emailLc,
    );
    if (!alreadyPending) {
      await clerk.organizations.createOrganizationInvitation({
        organizationId: orgId,
        inviterUserId: userId,
        emailAddress: emailLc,
        role: "org:member",
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/sign-in`,
      });
    }
    invitePending = true;
  }

  return { ...row, invitePending };
}

export async function updateUserForOrg(id: string, patch: Partial<UserInput>) {
  const { orgId, userId } = await auth();
  if (!orgId || !userId) throw new Error("Not authorised");
  const sb = await getServerSupabaseClient();

  const me = await requireAdmin(sb, orgId, userId);

  const { data: target, error: tErr } = await sb
    .from("users")
    .select("id, role, clerk_organisation_id")
    .eq("id", id)
    .eq("clerk_organisation_id", orgId)
    .is("deleted_at", null)
    .single();
  if (tErr || !target) throw new Error("User not found.");

  if (me.id === target.id && patch.role && patch.role !== "admin") {
    throw new Error("You can't change your own role from admin.");
  }

  if (target.role === "admin" && patch.role && patch.role !== "admin") {
    const others = await countOtherAdmins(sb, orgId, target.id);
    if (others < 1)
      throw new Error("Each organisation must keep at least one admin.");
  }

  const updates: {
    full_name?: string;
    email?: string;
    role?: UserRole;
    assigned_location_ids?: string[] | null;
    label?: string | null;
    updated_at?: string;
  } = {};

  // Always trim and lower-case email
  const normalisedEmail = patch.email?.trim().toLowerCase();

  if (patch.fullName !== undefined) updates.full_name = patch.fullName;
  if (normalisedEmail !== undefined) updates.email = normalisedEmail;
  if (patch.role !== undefined) updates.role = patch.role;
  if (patch.assignedLocationIds !== undefined)
    updates.assigned_location_ids = patch.assignedLocationIds ?? null;

  if (patch.fullName !== undefined || patch.email !== undefined) {
    updates.label = patch.fullName || normalisedEmail || null;
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await sb
    .from("users")
    .update(updates)
    .eq("id", id)
    .eq("clerk_organisation_id", orgId)
    .is("deleted_at", null)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function softDeleteUser(id: string) {
  const { orgId, userId } = await auth();
  if (!orgId || !userId) return { ok: false, reason: "auth" };

  const sb = await getServerSupabaseClient();

  // Only admins can delete
  const authorised = await requireAdmin(sb, orgId, userId)
    .then(() => true)
    .catch(() => false);
  if (!authorised) return { ok: false, reason: "forbidden" };

  // Find target (active only)
  const { data: target, error: tErr } = await sb
    .from("users")
    .select("id, role, clerk_user_id, email")
    .eq("id", id)
    .eq("clerk_organisation_id", orgId)
    .is("deleted_at", null)
    .single();

  if (tErr?.code === "PGRST116") return { ok: false, reason: "not_found" }; // no rows
  if (!target) return { ok: true }; // already removed

  // Self-removal guard (nicer UX than waiting for DB error)
  if (target.clerk_user_id === userId) {
    return { ok: false, reason: "self" };
  }

  // (Optional) pre-check last admin for friendlier error
  if (target.role === "admin") {
    const others = await countOtherAdmins(sb, orgId, id);
    if (others < 1) {
      return { ok: false, reason: "last_admin" };
    }
  }

  // Soft delete (DB trigger still back-stops last-admin)
  const { error: updErr } = await sb
    .from("users")
    .update(
      { deleted_at: new Date().toISOString() } as const,
      { returning: "minimal" } as MinimalReturn,
    )
    .eq("id", id)
    .eq("clerk_organisation_id", orgId)
    .is("deleted_at", null);

  if (updErr) {
    // Your trigger likely RAISEs exception code P0001 when last admin
    if (updErr.code === "P0001") return { ok: false, reason: "last_admin" };
    return { ok: false, reason: "db_error", message: updErr.message };
  }

  // Optional: remove from Clerk org (best effort)
  if (!target.clerk_user_id && !target.email) {
    return { ok: true };
  }

  try {
    await removeFromClerkOrg({
      orgId,
      requestingUserId: userId,
      clerkUserId: target.clerk_user_id ?? undefined,
      email: target.email ?? undefined,
    });
  } catch (e) {
    // Log and continue; DB already removed the row
    console.warn("[softDeleteUser] Clerk removal failed", e);
  }

  return { ok: true };
}

// server
export async function resendInviteForUser(
  userId: string,
  opts?: { force?: boolean },
) {
  const { orgId, userId: adminId } = await auth();
  if (!orgId || !adminId)
    return { ok: false, status: "not_authorised" as const };

  const sb = await getServerSupabaseClient();
  try {
    await requireAdmin(sb, orgId, adminId);
  } catch {
    return { ok: false, status: "not_authorised" as const };
  }

  const { data: u, error } = await sb
    .from("users")
    .select("email, clerk_user_id")
    .eq("id", userId)
    .eq("clerk_organisation_id", orgId)
    .single();
  if (error || !u) return { ok: false, status: "not_found" as const };
  if (!u.email) return { ok: false, status: "missing_email" as const };

  const emailLc = u.email.toLowerCase();
  const clerk = await clerkClient();

  try {
    // Are they already a member? If so, skip.
    const { data: memberships } =
      await clerk.organizations.getOrganizationMembershipList({
        organizationId: orgId,
      });
    const isMember = (memberships ?? []).some(
      (m) =>
        m.publicUserData?.userId && m.publicUserData.userId === u.clerk_user_id,
    );
    if (isMember) return { ok: false, status: "already_member" as const };

    // Check pending invites
    const { data: invites } =
      await clerk.organizations.getOrganizationInvitationList({
        organizationId: orgId,
        status: ["pending"],
      });

    const mine = (invites ?? []).filter(
      (i) => i.emailAddress?.toLowerCase() === emailLc,
    );

    if (mine.length && !opts?.force) {
      // tell the client it's already pending
      return { ok: true, status: "already_pending" as const };
    }

    if (mine.length && opts?.force) {
      // revoke all existing pending invites for this email first
      await Promise.allSettled(
        mine.map((i) =>
          clerk.organizations.revokeOrganizationInvitation({
            organizationId: orgId,
            invitationId: i.id,
            requestingUserId: adminId,
          }),
        ),
      );
    }

    // create a fresh invite (this sends a new email)
    await clerk.organizations.createOrganizationInvitation({
      organizationId: orgId,
      inviterUserId: adminId,
      emailAddress: emailLc,
      role: "org:member",
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/sign-in`,
    });

    return {
      ok: true,
      status: mine.length ? ("resent" as const) : ("sent" as const),
    };
  } catch (e: unknown) {
    const err = e as { status?: number };
    if (err.status === 403) return { ok: false, status: "forbidden" as const };
    if (err.status === 422)
      return { ok: false, status: "invalid_email" as const };
    return { ok: false, status: "server_error" as const };
  }
}
