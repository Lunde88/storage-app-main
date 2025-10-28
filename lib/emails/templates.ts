// lib/emails/templates.ts
type BaseCtx = {
  clientName: string;
  vehicleReg: string;
  occurredAt: string;
  notes?: string | null;
};
type CheckInCtx = BaseCtx & { checkInDetails: Record<string, string> };
type CheckoutCtx = BaseCtx & { fromLocation?: string | null };

export const tpl = {
  checkIn({
    clientName,
    vehicleReg,
    occurredAt,
    notes,
    checkInDetails,
  }: CheckInCtx) {
    const rows = Object.entries(checkInDetails)
      .map(
        ([k, v]) => `
              <tr>
                <td style="padding:6px 8px;border:1px solid #ddd;font-weight:600;">
                  ${k}
                </td>
                <td style="padding:6px 8px;border:1px solid #ddd;">
                  ${v}
                </td>
              </tr>
            `,
      )
      .join("");

    const subject = `Check-in confirmation — ${vehicleReg} (${occurredAt})`;
    const html = `
      <p>Hi ${clientName},</p>
      <p>This email confirms that <strong>${vehicleReg}</strong> has been checked in. The condition report is attached below.</p>
      <h3 style="margin-top:16px;">Check-in Details</h3>
      <table style="border-collapse:collapse;width:100%;font-size:14px;">${rows}</table>
      ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ""}
      <p>Report date: ${occurredAt}</p>
      <p>If you have any questions, just reply to this email.</p>
      <p>Kind regards,<br/>The Storage Team</p>
    `.trim();

    const text = [
      `Hi ${clientName},`,
      ``,
      `This email confirms that ${vehicleReg} has been checked in. The condition report is attached.`,
      ``,
      ...Object.entries(checkInDetails).map(([k, v]) => `${k}: ${v}`),
      notes ? `Notes: ${notes}` : "",
      ``,
      `Report date: ${occurredAt}`,
      ``,
      `If you have any questions, just reply to this email.`,
      ``,
      `Kind regards,`,
      `The Storage Team`,
    ].join("\n");

    return { subject, html, text };
  },

  checkout({ clientName, vehicleReg, occurredAt, fromLocation }: CheckoutCtx) {
    const subject = `Check-out confirmation — ${vehicleReg} (${occurredAt})`;
    const line = `This email confirms that <strong>${vehicleReg}</strong> was <strong>checked out</strong>${
      fromLocation ? ` from <strong>${fromLocation}</strong>` : ""
    } on ${occurredAt}.`;

    const html = `
      <p>Hi ${clientName},</p>
      <p>${line}</p>
      <p>Kind regards,<br/>The Storage Team</p>
    `.trim();

    const text = [
      `Hi ${clientName},`,
      ``,
      line.replace(/<[^>]+>/g, ""),
      ``,
      `Kind regards,`,
      `The Storage Team`,
    ].join("\n");

    return { subject, html, text };
  },

  report({
    clientName,
    vehicleReg,
    reportCreatedAt,
    message,
    type,
  }: {
    clientName: string;
    vehicleReg: string;
    reportCreatedAt: string;
    message?: string | null;
    type?: string | null;
  }) {
    const subjectPrefix =
      type === "check-in"
        ? "Check-in condition report"
        : type === "check-out"
          ? "Check-out condition report"
          : "Condition report";

    const subject = `${subjectPrefix} — ${vehicleReg} (${reportCreatedAt})`;

    const intro =
      type === "check-in"
        ? `This email contains the check-in report for <strong>${vehicleReg}</strong>. The condition report is attached below.`
        : type === "check-out"
          ? `This email contains the check-out report for <strong>${vehicleReg}</strong>. The condition report is attached below.`
          : `Please find attached the condition report for <strong>${vehicleReg}</strong>.`;

    const extra = message?.trim() ? `<p>${message.trim()}</p>` : "";

    const html = `
    <p>Hi ${clientName},</p>
    <p>${intro}</p>
    ${extra}
    <p><strong>Report created:</strong> ${reportCreatedAt}</p>
    <p>If you have any questions, just reply to this email.</p>
    <p>Kind regards,<br/>The Storage Team</p>
  `.trim();

    const text = [
      `Hi ${clientName},`,
      ``,
      intro.replace(/<[^>]+>/g, ""),
      message?.trim() ? `\nMessage: ${message.trim()}\n` : "",
      `Report created: ${reportCreatedAt}`,
      ``,
      `If you have any questions, just reply to this email.`,
      ``,
      `Kind regards,`,
      `The Storage Team`,
    ]
      .join("\n")
      .trim();

    return { subject, html, text };
  },
};
