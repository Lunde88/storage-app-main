// lib/emails/core/sendMail.ts
import { Resend, type CreateEmailOptions } from "resend";

export type Attachment = {
  filename: string;
  content: Buffer | string;
  contentType: string;
};

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+\n/g, "\n")
    .trim();
}

export class MailSendError extends Error {
  constructor(
    message: string,
    public readonly meta?: {
      status?: number;
      code?: string;
      details?: unknown;
    },
  ) {
    super(message);
    this.name = "MailSendError";
  }
}

export async function sendMail(input: {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: ReadonlyArray<Attachment>;
  cc?: string | string[] | null;
  bcc?: string | string[] | null;
  from?: string;
  headers?: Record<string, string>;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // Don’t throw — treat as soft-fail in dev
    console.warn("[sendMail] Missing RESEND_API_KEY");
    return;
  }

  const resend = new Resend(key);
  const text = input.text ?? (input.html ? stripHtml(input.html) : " ");

  const payload: CreateEmailOptions = {
    from: input.from ?? "Storage App <mail@email-testing.builtbymagnus.co.uk>",
    to: input.to,
    subject: input.subject,
    text,
    ...(input.html ? { html: input.html } : {}),
    ...((input.cc ?? undefined) ? { cc: input.cc as string | string[] } : {}),
    ...((input.bcc ?? undefined)
      ? { bcc: input.bcc as string | string[] }
      : {}),
    ...(input.attachments && input.attachments.length
      ? { attachments: [...input.attachments] } // clone readonly -> mutable
      : {}),
    ...(input.headers ? { headers: input.headers } : {}),
  };

  try {
    const { data, error } = await resend.emails.send(payload);
    if (error) {
      // Try to pull structured info if present
      const status = (error as unknown as { statusCode?: number }).statusCode;
      const code =
        (error as unknown as { name?: string; code?: string }).code ??
        (error as unknown as { name?: string }).name;
      const details =
        (error as unknown as { response?: { body?: unknown } }).response
          ?.body ?? (error as unknown as { message?: string }).message;

      throw new MailSendError(
        `[Resend] ${code ?? "send_failed"}: ${error.message}`,
        { status, code, details },
      );
    }
    // Optionally log success with id/receipt
    if (process.env.NODE_ENV !== "production") {
      console.log("[sendMail] sent ok", { id: (data as { id?: string })?.id });
    }
  } catch (e) {
    if (e instanceof MailSendError) throw e;
    const err = e as Error & {
      statusCode?: number;
      response?: { body?: unknown };
      code?: string;
      name?: string;
    };
    throw new MailSendError(err.message, {
      status: err.statusCode,
      code: err.code ?? err.name,
      details: err.response?.body,
    });
  }
}
