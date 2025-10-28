export const formatDateGb = (s: string | Date): string =>
  new Date(s).toLocaleDateString("en-GB", { timeZone: "Europe/London" });
