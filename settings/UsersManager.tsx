"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createUserForOrg,
  updateUserForOrg,
  softDeleteUser,
  UserInput,
  resendInviteForUser,
} from "@/lib/actions/userAdminActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2 } from "lucide-react";

type DbUser = {
  id: string;
  full_name: string;
  label: string;
  email: string;
  role: "admin" | "manager" | "staff";
  assigned_location_ids: string[] | null;
  clerk_user_id: string | null;
};
type DbError = {
  code?: string;
  status?: number;
  message?: string;
};

export type UiUser = DbUser & { invitePending: boolean };

type Location = { id: string; name: string };

function normaliseError(e: unknown): string {
  const err = e as DbError;
  const code = err?.code ?? err?.status ?? "";
  const message = (err?.message ?? "").toLowerCase();

  if (message.includes("only admins can manage users")) {
    return "Only admins can manage users.";
  }
  if (message.includes("not authorised") || code === 401 || code === 403) {
    return "Not authorised.";
  }
  if (
    message.includes("row-level security") ||
    message.includes("insufficient_privilege") ||
    code === "42501"
  ) {
    return "Your role doesn't allow this action.";
  }
  if (code === "23505" || message.includes("duplicate key")) {
    return "That email already exists in this organisation.";
  }
  return "Something went wrong. Please try again.";
}

export default function UsersManager({
  initialUsers,
  allLocations,
  maxUsers,
}: {
  initialUsers: UiUser[];
  allLocations: Location[];
  maxUsers: number;
}) {
  const [rows, setRows] = useState(initialUsers);
  const [open, setOpen] = useState<
    null | { mode: "add" } | { mode: "edit"; id: string }
  >(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [saving, start] = useTransition();

  const editing = useMemo(() => {
    if (open?.mode !== "edit") return null;
    return rows.find((u) => u.id === open.id) ?? null;
  }, [open, rows]);

  const [form, setForm] = useState<UserInput>({
    fullName: "",
    email: "",
    role: "staff",
    assignedLocationIds: [],
  });

  const resetForm = () =>
    setForm({
      fullName: "",
      email: "",
      role: "staff",
      assignedLocationIds: [],
    });

  const beginAdd = () => {
    resetForm();
    setOpen({ mode: "add" });
  };
  const beginEdit = (u: DbUser) => {
    setForm({
      fullName: u.full_name,
      email: u.email,
      role: u.role,
      assignedLocationIds: u.assigned_location_ids ?? [],
    });
    setOpen({ mode: "edit", id: u.id });
  };

  const submit = () =>
    start(async () => {
      const payload: UserInput = {
        ...form,
        // Convert [] → null so DB stores “all locations”
        assignedLocationIds:
          form.assignedLocationIds && form.assignedLocationIds.length > 0
            ? form.assignedLocationIds
            : null,
      };

      try {
        if (open?.mode === "add") {
          const created = await createUserForOrg(payload);
          setRows((r) => [...r, created]);
          setOpen(null);
          resetForm();
        } else if (open?.mode === "edit" && editing) {
          const updated = await updateUserForOrg(editing.id, payload);
          setRows((r) => r.map((x) => (x.id === editing.id ? updated : x)));
          setOpen(null);
        }
      } catch (e: unknown) {
        alert(normaliseError(e));
      }
    });

  const remove = (u: DbUser) =>
    start(async () => {
      if (!confirm(`Remove ${u.full_name}?`)) return;
      try {
        const res = await softDeleteUser(u.id);
        if (res?.ok) {
          setRows((r) => r.filter((x) => x.id !== u.id));
        } else {
          alert(
            res.reason === "self"
              ? "You can't remove yourself."
              : res.reason === "last_admin"
                ? "You can't remove the only admin."
                : res.reason === "not_found"
                  ? "User already removed."
                  : res.reason === "forbidden"
                    ? "Not authorised."
                    : "Could not remove user.",
          );
        }
      } catch (e) {
        console.error(e);
        alert("Something went wrong removing the user.");
      }
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-end gap-1">
        <Button onClick={beginAdd} disabled={rows.length >= maxUsers}>
          <Plus className="mr-2 h-4 w-4" /> Add user
        </Button>
        {rows.length >= maxUsers && (
          <p className="text-muted-foreground text-xs">
            You have reached the maximum of {maxUsers} users.
          </p>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="text-muted-foreground text-sm">No users yet.</div>
      ) : (
        <ul className="divide-y rounded border">
          {rows.map((u) => (
            <li
              key={u.id}
              className="flex flex-col gap-1 p-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="flex items-center gap-2 font-medium">
                  {u.full_name}
                  {u.invitePending && (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                      Invite pending
                    </span>
                  )}
                </div>
                <div className="text-muted-foreground text-sm">{u.email}</div>
                <div className="text-muted-foreground mt-1 text-xs">
                  Role: <span className="uppercase">{u.role}</span>
                  {u.assigned_location_ids &&
                  u.assigned_location_ids.length > 0 ? (
                    <> · Locations: {u.assigned_location_ids.length}</>
                  ) : (
                    <> · Locations: All</>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {u.invitePending && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={resendingId === u.id} // disable if this row is resending
                    onClick={() =>
                      start(async () => {
                        setResendingId(u.id); // mark as resending
                        try {
                          const res = await resendInviteForUser(u.id, {
                            force: true,
                          });

                          if (res.ok) {
                            alert(
                              res.status === "resent"
                                ? "Invite resent."
                                : res.status === "sent"
                                  ? "Invite sent."
                                  : "Invite already pending.",
                            );
                          } else {
                            const msg =
                              res.status === "already_member"
                                ? "User is already a member."
                                : res.status === "missing_email"
                                  ? "User has no email address."
                                  : res.status === "not_found"
                                    ? "User not found."
                                    : res.status === "not_authorised"
                                      ? "Not authorised."
                                      : res.status === "forbidden"
                                        ? "Not allowed to invite."
                                        : res.status === "invalid_email"
                                          ? "Invalid email."
                                          : "Could not resend invite.";
                            alert(msg);
                          }
                        } finally {
                          // Re-enable button after a short cooldown
                          setTimeout(() => setResendingId(null), 3000);
                        }
                      })
                    }
                  >
                    {resendingId === u.id ? "Resending…" : "Resend invite"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => beginEdit(u)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => remove(u)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {open?.mode === "edit" ? "Edit user" : "Add user"}
            </DialogTitle>
            <DialogDescription>
              Set role and (optionally) restrict to locations.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>Full name</Label>
              <Input
                value={form.fullName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fullName: e.target.value }))
                }
                disabled={saving}
              />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                disabled={saving || open?.mode === "edit"} // usually immutable after linking to Clerk
              />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, role: v as UserInput["role"] }))
                }
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Multi-select locations via Popover + Checkbox list */}
            <div className="space-y-1">
              <Label>Locations</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {form.assignedLocationIds?.length
                      ? `${form.assignedLocationIds.length} selected`
                      : "All locations"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2">
                  <div className="max-h-64 space-y-2 overflow-auto">
                    {allLocations.map((loc) => {
                      const checked =
                        form.assignedLocationIds?.includes(loc.id) ?? false;
                      return (
                        <label
                          key={loc.id}
                          className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded p-1"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              setForm((f) => {
                                const set = new Set(
                                  f.assignedLocationIds ?? [],
                                );
                                if (v === true) set.add(loc.id);
                                else set.delete(loc.id);
                                return {
                                  ...f,
                                  assignedLocationIds: Array.from(set),
                                };
                              });
                            }}
                          />
                          <span className="text-sm">{loc.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setForm((f) => ({ ...f, assignedLocationIds: [] }))
                      }
                    >
                      Clear
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          assignedLocationIds: allLocations.map((l) => l.id),
                        }))
                      }
                    >
                      Select all
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <p className="text-muted-foreground text-xs">
                Leave empty for access to all locations.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving
                ? "Saving…"
                : open?.mode === "edit"
                  ? "Save changes"
                  : "Add user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
