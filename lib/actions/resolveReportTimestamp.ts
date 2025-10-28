export type ReportTimestampInput = {
  reportId: string;
  reportTimestampIso?: string | null;
};

type ReportTimestampRow = {
  submitted_at: string | null;
  created_at: string | null;
};

export type ReportTimestampFetcher = () => Promise<ReportTimestampRow | null>;

const parseIsoDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const resolveReportTimestamp = async (
  input: ReportTimestampInput,
  fetchReportTimestamp?: ReportTimestampFetcher,
): Promise<Date> => {
  const payloadTimestamp = parseIsoDate(input.reportTimestampIso);

  if (payloadTimestamp) return payloadTimestamp;

  const reportRow = fetchReportTimestamp ? await fetchReportTimestamp() : null;

  return (
    parseIsoDate(reportRow?.submitted_at) ??
    parseIsoDate(reportRow?.created_at) ??
    new Date()
  );
};
