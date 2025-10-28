"use client";

export function ConfirmStep({
  summary,
}: {
  /** Pre-built summary node from the wizard (vehicle, recipient, draft id, etc.) */
  summary: React.ReactNode;
}) {
  return <div className="space-y-3 text-sm">{summary}</div>;
}
