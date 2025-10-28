import CardDivider from "../base/card/CardDivider";

type VehicleListItemContentProps = {
  identifier?: string | null;
  make?: string | null;
  model?: string | null;
  client?: string | null;
  colour?: string | null;
  year?: number | string | null;
  lastCheckinTime?: string | null;
  lastMovementTime?: string | null;
  lastEventType?: "check-in" | "check-out" | "transfer" | undefined;
};

export default function VehicleListItemContent({
  identifier,
  make,
  model,
  client,
  colour,
  year,
  lastCheckinTime,
  lastMovementTime,
  lastEventType,
}: VehicleListItemContentProps) {
  // Prefer lastMovementTime if present, else lastCheckinTime
  const dateTime = lastMovementTime || lastCheckinTime || null;

  // Build a safe display name
  const title =
    [make, model].filter(Boolean).join(" ") || identifier || "Unnamed vehicle";

  // Optional subline: colour, year, client
  const metaBits = [
    colour || null,
    year != null && year !== "" ? String(year) : null,
    client || null,
  ].filter(Boolean);

  const eventTypeLabel =
    lastEventType === "check-in"
      ? "Checked in"
      : lastEventType === "check-out"
        ? "Checked out"
        : lastEventType === "transfer"
          ? "Transferred"
          : "Last movement";

  return (
    <div className="space-y-2">
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium">{title}</p>

          {identifier ? (
            <span className="font-heading inline-block rounded-sm border border-[#5C5757] bg-[#FFFDE1] px-2 py-1 text-sm font-semibold uppercase">
              {identifier}
            </span>
          ) : null}
        </div>

        {metaBits.length > 0 && (
          <p className="text-xs">{metaBits.join(" | ")}</p>
        )}
      </div>

      <CardDivider />

      {dateTime && (
        <div className="flex justify-between text-xs">
          <span className="font-semibold">{eventTypeLabel}:</span>
          {(() => {
            const date = new Date(dateTime);
            const [d, t] = date
              .toLocaleString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })
              .split(", ");
            const dateWithHyphens = d.replace(/\//g, "-");
            return `${dateWithHyphens} | ${t}`;
          })()}
        </div>
      )}
    </div>
  );
}
