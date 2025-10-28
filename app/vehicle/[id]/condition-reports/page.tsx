import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabaseClient } from "@/lib/supabaseServer";
import { keysToCamelCase } from "@/utils/case";
import { getReportTypeLabel } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// --- Helpers ---
function formatDateUK(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  const dateStr = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    timeZone: "Europe/London",
  }).format(date);
  const timeStr = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/London",
  }).format(date);
  return `${dateStr} at ${timeStr}`;
}

export default async function VehicleConditionReportsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await getServerSupabaseClient();
  const { id } = await params;

  // --- Check if vehicle exists ---
  const { data: vehicle, error: vehicleError } = await supabase
    .from("assets")
    .select("id, identifier")
    .eq("id", id)
    .maybeSingle();

  if (vehicleError || !vehicle) {
    return notFound();
  }

  // --- Fetch all condition reports for this vehicle ---
  const { data: reports, error } = await supabase
    .from("condition_reports")
    .select("*")
    .eq("asset_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return <div className="p-6">Error fetching condition reports.</div>;
  }

  const reportList = reports?.map((r) => keysToCamelCase(r)) || [];

  return (
    <div className="flex min-h-[80vh] w-full flex-col items-center px-2 py-8">
      <div className="w-full max-w-3xl">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/inventory">Inventory</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink className="uppercase" asChild>
                <Link href={`/vehicle/${vehicle.id}`}>
                  {vehicle.identifier}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage> Condition Reports</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Card>
          <CardHeader>
            <CardTitle className="uppercase">
              Condition Reports for {vehicle.identifier}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reportList.length === 0 ? (
              <p className="text-muted-foreground">
                No condition reports found.
              </p>
            ) : (
              <ul className="divide-muted divide-y">
                {reportList.map((report) => (
                  <li key={report.id} className="py-3">
                    <Link
                      href={`/vehicle/${vehicle.id}/condition-reports/${report.id}`}
                      className="flex flex-col hover:underline"
                    >
                      <span className="text-muted-foreground text-sm">
                        {formatDateUK(report.createdAt)}
                      </span>
                      <span className="font-medium">
                        {getReportTypeLabel(report.reportType) ??
                          "Unknown Report"}
                      </span>
                      {report.odometer && (
                        <span className="text-muted-foreground text-xs">
                          Odometer: {report.odometer} miles
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
