"use client";

import { sendEmailReport } from "@/lib/actions/sendReportEmail";
import { useState } from "react";

export default function SendReportEmailButton({
  reportId,
  vehicleId,
  defaultTo = "",
  reportTimestampIso,
  reportType,
}: {
  reportId: string;
  vehicleId: string;
  defaultTo?: string;
  reportTimestampIso?: string | null;
  reportType?: string | null;
}) {
  const [to, setTo] = useState(defaultTo);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSend() {
    setLoading(true);
    setMsg(null);
    setErr(null);
    try {
      await sendEmailReport({
        reportId,
        vehicleId,
        to,
        reportTimestampIso: reportTimestampIso ?? undefined,
        reportType,
      });
      setMsg("Email sent ✓");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <label className="text-muted-foreground mb-1 block text-xs uppercase">
        Recipient email
      </label>
      <div className="flex gap-2">
        <input
          type="email"
          className="flex-1 rounded border px-2 py-1"
          placeholder="recipient@example.com"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
        <button
          onClick={onSend}
          disabled={!to || loading}
          className="rounded bg-black px-3 py-1 text-white disabled:opacity-50"
        >
          {loading ? "Sending…" : "Email report"}
        </button>
      </div>
      {msg && <p className="mt-2 text-sm text-green-700">{msg}</p>}
      {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
    </div>
  );
}
