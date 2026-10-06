import "server-only";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Overrides the default Reply-To. */
  replyTo?: string;
  /** Display name only — the address always stays on the verified domain. */
  fromName?: string;
}

export type SendEmailResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

// Resend only accepts senders on a verified domain — the verified one is the
// mail.brainlight-suisse.ch subdomain, not the root domain.
const DEFAULT_FROM = "brainLight Suisse <info@mail.brainlight-suisse.ch>";
const REPLY_TO = "info@brainlight-suisse.ch";

function resolveFrom(fromName?: string): string {
  const configured = process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;
  if (!fromName) return configured;
  const address = configured.match(/<([^>]+)>/)?.[1] ?? configured;
  const safeName = fromName
    .replace(/["<>\r\n,;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return safeName ? `${safeName} <${address}>` : configured;
}

// Never throws: callers treat a failed email as non-blocking.
export async function sendEmail(
  input: SendEmailInput
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "missing_resend_api_key" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resolveFrom(input.fromName),
        to: [input.to],
        reply_to: input.replyTo || REPLY_TO,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const json = (await res.json().catch(() => null)) as {
      id?: string;
      message?: string;
    } | null;
    if (!res.ok) {
      return { ok: false, error: json?.message ?? `http_${res.status}` };
    }
    return { ok: true, id: json?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown_error" };
  }
}
