import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { computeBucket } from "@/lib/stats";
import type { Lang } from "@/lib/i18n";
import type { RatingValues, Session } from "@/lib/types";
import { sendEmail } from "./send";
import {
  renderResultsEmail,
  resolveCtaUrl,
  type MetricResult,
} from "./templates";

export function reductionPercent(before: number, after: number): number | null {
  if (!(before > 0)) return null;
  return Math.round(((before - after) / before) * 100);
}

const METRIC_KEYS = ["stress", "fatigue_nerveuse", "fatigue_physique"] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// `delta` is the group's percent change (dashboard method); null hides the
// average line in the email.
function buildMetrics(
  before: RatingValues,
  after: RatingValues,
  delta: RatingValues | null
): MetricResult[] {
  return METRIC_KEYS.map((key) => ({
    key,
    before: before[key],
    after: after[key],
    reduction: reductionPercent(before[key], after[key]),
    average: delta ? Math.round(-delta[key]) : null,
  }));
}

// Sends the participant's results email once their "after" answers are saved.
// Returns true only if the email actually went out. Never throws and never
// blocks data saving: the caller has already persisted everything.
export async function sendExpoResultsEmail(opts: {
  session: Session;
  after: { stress: number; fatigue_nerveuse: number; fatigue_physique: number };
  baseUrl: string;
}): Promise<boolean> {
  const { session, after, baseUrl } = opts;
  if (!session.send_results_email) return false;

  const { data: lead } = await supabaseAdmin
    .from("responses")
    .select(
      "id, prenom, email, lang, stress, fatigue_nerveuse, fatigue_physique, email_consent, email_sent_at"
    )
    .eq("session_id", session.id)
    .eq("phase", "before")
    .maybeSingle();

  if (!lead || !lead.email || !lead.email_consent || lead.email_sent_at) {
    return false;
  }

  const lang: Lang = lead.lang === "de" ? "de" : "fr";

  // Event-wide average: every Expo participant of the same event, using the
  // same method as the dashboard (reduction of the averages).
  const { data: rows } = await supabaseAdmin
    .from("responses")
    .select(
      "session_id, phase, participant_number, stress, fatigue_nerveuse, fatigue_physique, lead_optin, sessions!inner(type, event_name)"
    )
    .eq("sessions.type", "expo")
    .eq("sessions.event_name", session.event_name);

  const bucket = computeBucket(
    (rows ?? []) as unknown as Parameters<typeof computeBucket>[0]
  );
  const metrics = buildMetrics(lead, after, bucket.delta);

  const { subject, html, text } = renderResultsEmail({
    lang,
    prenom: lead.prenom ?? "",
    eventName: session.event_name,
    metrics,
    ctaUrl: resolveCtaUrl(lang, session.event_name),
    logoUrl: `${baseUrl}/brainlight-logo.png`,
  });

  const result = await sendEmail({ to: lead.email, subject, html, text });
  if (!result.ok) {
    console.error("[results-email] send failed:", result.error);
    return false;
  }

  const { error } = await supabaseAdmin
    .from("responses")
    .update({ email_sent_at: new Date().toISOString() })
    .eq("id", lead.id);
  if (error) console.error("[results-email] email_sent_at update failed:", error);

  return true;
}

// Coach sessions (Showcase / Event / Energy Days) need this many matched
// participants before the email shows a group average — below that, the
// "average" is mostly the participant's own result.
const COACH_AVERAGE_MIN_PARTICIPANTS = 3;

// Results email for a coach-session participant who ticked the opt-in and
// left an email on their "after" form. Same guarantees as the Expo email:
// never throws, never blocks saving, sends at most once per participant
// (email_sent_at on the after row).
export async function sendCoachResultsEmail(opts: {
  session: Pick<Session, "id" | "type" | "event_name" | "send_results_email">;
  afterRow: RatingValues & {
    id: string;
    participant_number: number;
    prenom: string | null;
    email: string | null;
    lang: string | null;
    lead_optin: boolean;
    email_consent: boolean;
    email_sent_at: string | null;
  };
  baseUrl: string;
}): Promise<boolean> {
  const { session, afterRow, baseUrl } = opts;
  if (!session.send_results_email) return false;

  const email = afterRow.email?.trim() ?? "";
  if (
    !afterRow.lead_optin ||
    !afterRow.email_consent ||
    !EMAIL_RE.test(email) ||
    afterRow.email_sent_at
  ) {
    return false;
  }

  const { data: before } = await supabaseAdmin
    .from("responses")
    .select("stress, fatigue_nerveuse, fatigue_physique")
    .eq("session_id", session.id)
    .eq("phase", "before")
    .eq("participant_number", afterRow.participant_number)
    .maybeSingle();
  if (!before) {
    // No "before" answers for this number: there is nothing to compare.
    console.warn("[results-email] coach participant without before answers, skipped");
    return false;
  }

  const { data: rows } = await supabaseAdmin
    .from("responses")
    .select(
      "session_id, phase, participant_number, stress, fatigue_nerveuse, fatigue_physique, lead_optin"
    )
    .eq("session_id", session.id);
  const bucket = computeBucket(rows ?? []);
  const showAverage =
    session.type !== "showcase" &&
    bucket.matched_count >= COACH_AVERAGE_MIN_PARTICIPANTS;

  const lang: Lang = afterRow.lang === "de" ? "de" : "fr";
  const { subject, html, text } = renderResultsEmail({
    lang,
    prenom: afterRow.prenom ?? "",
    eventName: session.event_name,
    metrics: buildMetrics(before, afterRow, showAverage ? bucket.delta : null),
    ctaUrl: resolveCtaUrl(lang, session.event_name),
    logoUrl: `${baseUrl}/brainlight-logo.png`,
    context: "coach",
  });

  const result = await sendEmail({ to: email, subject, html, text });
  if (!result.ok) {
    console.error("[results-email] coach send failed:", result.error);
    return false;
  }

  const { error } = await supabaseAdmin
    .from("responses")
    .update({ email_sent_at: new Date().toISOString() })
    .eq("id", afterRow.id);
  if (error) console.error("[results-email] email_sent_at update failed:", error);

  return true;
}
