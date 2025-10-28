// lib/emails/core/pdf.ts
export async function maybeBuildReportPdf(
  conditionReportId: string | null | undefined,
  assetId: string | null | undefined,
  timeoutMs = 12_000,
) {
  if (!conditionReportId || !assetId) return undefined;
  try {
    const { generateReportPdf } = await import(
      "@/components/pdf/generateReportPdf"
    );
    const pdf = await withTimeout(
      generateReportPdf(conditionReportId, assetId),
      timeoutMs,
    );
    return [
      {
        filename: pdf.filename,
        content: pdf.buffer,
        contentType: "application/pdf",
      },
    ];
  } catch (e) {
    console.warn("[pdf] failed, sending without attachment:", e);
    return undefined;
  }
}

function withTimeout<T>(p: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}
