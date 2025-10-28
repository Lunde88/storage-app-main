// lib/emails/core/format.ts
export const ukDateTime = (iso: string | Date) =>
  new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(typeof iso === "string" ? new Date(iso) : iso);

export const fullName = (first?: string | null, last?: string | null) =>
  [first, last].filter(Boolean).join(" ") || "there";

export const asReg = (v?: string | null) => (v ?? "").toUpperCase();

export const niceKey = (k: string) => k.replace(/([A-Z])/g, " $1");
