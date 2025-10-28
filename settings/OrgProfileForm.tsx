"use client";

import { useMemo, useState, useTransition } from "react";
import { updateOrganisation } from "@/lib/actions/orgSettingsActions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil, X, Save } from "lucide-react";

type OrgForm = {
  name: string;
  address: string;
  contactEmail: string;
  phone: string;
};

export default function OrgProfileForm({ initial }: { initial: OrgForm }) {
  // baseline is the last saved state (what we render in read-only)
  const [baseline, setBaseline] = useState<OrgForm>(initial);
  // draft is the editable copy while in edit mode
  const [draft, setDraft] = useState<OrgForm>(initial);
  const [editing, setEditing] = useState(false);
  const [saving, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const isDirty = useMemo(
    () =>
      draft.name !== baseline.name ||
      draft.address !== baseline.address ||
      draft.contactEmail !== baseline.contactEmail ||
      draft.phone !== baseline.phone,
    [draft, baseline],
  );

  const beginEdit = () => {
    setMsg(null);
    setErr(null);
    setDraft(baseline); // start from the last saved values
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(baseline); // discard changes
    setMsg(null);
    setErr(null);
  };

  const save = () => {
    setMsg(null);
    setErr(null);
    start(async () => {
      try {
        await updateOrganisation({
          name: draft.name.trim(),
          address: draft.address.trim() || null,
          contactEmail: draft.contactEmail.trim() || null,
          phone: draft.phone.trim() || null,
        });
        // commit draft → baseline and exit edit
        setBaseline(draft);
        setEditing(false);
        setMsg("Saved ✓");
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to save changes.");
      }
    });
  };

  // Render values: read-only shows baseline; edit shows draft
  const values = editing ? draft : baseline;

  return (
    <div className="grid gap-4">
      {/* Top action row */}
      <div className="flex items-center justify-end gap-2">
        {editing ? (
          <>
            <Button
              variant="outline"
              onClick={cancelEdit}
              disabled={saving}
              className="gap-1"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={saving || !isDirty || !values.name.trim()}
              className="gap-1"
            >
              {saving ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save
            </Button>
          </>
        ) : (
          <Button onClick={beginEdit} className="gap-1">
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        )}
      </div>

      {/* Name */}
      <div className="space-y-1">
        <Label>Name</Label>
        <Input
          value={values.name}
          onChange={(e) => setDraft((f) => ({ ...f, name: e.target.value }))}
          disabled={!editing || saving}
          placeholder="Company Ltd"
        />
      </div>

      {/* Address */}
      <div className="space-y-1">
        <Label>Address</Label>
        <Input
          value={values.address}
          onChange={(e) => setDraft((f) => ({ ...f, address: e.target.value }))}
          disabled={!editing || saving}
          placeholder="123 Example Street"
        />
      </div>

      {/* Contact email */}
      <div className="space-y-1">
        <Label>Contact email</Label>
        <Input
          type="email"
          value={values.contactEmail}
          onChange={(e) =>
            setDraft((f) => ({ ...f, contactEmail: e.target.value }))
          }
          disabled={!editing || saving}
          placeholder="ops@example.com"
        />
      </div>

      {/* Phone */}
      <div className="space-y-1">
        <Label>Phone</Label>
        <Input
          value={values.phone}
          onChange={(e) => setDraft((f) => ({ ...f, phone: e.target.value }))}
          disabled={!editing || saving}
          placeholder="+44 0000 000000"
        />
      </div>

      {/* Messages */}
      {(msg || err) && (
        <div className="pt-1">
          {msg && <p className="text-muted-foreground text-sm">{msg}</p>}
          {err && <p className="text-destructive text-sm">{err}</p>}
        </div>
      )}
    </div>
  );
}
