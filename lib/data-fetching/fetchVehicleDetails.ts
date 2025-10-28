export interface VehicleDetails {
  registrationNumber: string;
  make: string;
  colour: string;
  // Add any other fields as needed
}

export async function fetchVehicleDetails(
  vrn: string,
  options?: { signal?: AbortSignal },
): Promise<VehicleDetails | null> {
  const endpoint =
    process.env.NODE_ENV === "production"
      ? "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles"
      : "https://uat.driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles";

  const apiKey = process.env.VES_API_KEY;

  if (!apiKey) throw new Error("VES_API_KEY not set in environment");

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "x-api-key": apiKey!,
      "Content-Type": "application/json",
    },
    signal: options?.signal,
    body: JSON.stringify({ registrationNumber: vrn }),
  });

  if (!res.ok) {
    // Optionally log error details here for monitoring
    return null;
  }

  return (await res.json()) as VehicleDetails;
}
