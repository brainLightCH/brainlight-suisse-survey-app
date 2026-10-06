import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { computeBucket } from "@/lib/stats";
import type { Lang } from "@/lib/i18n";
import type { Session } from "@/lib/types";
import { sendEmail } from "./send";
import { renderResultsEmail, resolveCtaUrl } from "./templates";

export function reductionPercent(before: number, after: number): number | null {
  if (!(before > 0)) return null;
  return Math.round(((before - after) / before) * 100);
}

export function sessionMinutes(): number {
  const n = Number(process.env.EXPO_SESSION_MINUTES);
  return n > 0 ? Math.round(n) : 20;
}

// Sends the participant's results email once their "after" answers are saved.
// Returns true only if the email actually went out. Never throws and never
// blocks data saving: the caller has already persisted everything.
export async function sendExpoResultsEmail(opts: {
  session: Session;
  afterStress: number;
  baseUrl: string;
}): Promise<boolean> {
  const { session, afterStress, baseUrl } = opts;
  if (!session.send_results_email) return false;

  const { data: lead } = await supabaseAdmin
    .from("responses")
    .select("id, prenom, email, lang, stress, email_consent, email_sent_at")
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
  const average = bucket.delta ? Math.round(-bucket.delta.stress) : null;

  const { subject, html, text } = renderResultsEmail({
    lang,
    prenom: lead.prenom ?? "",
    eventName: session.event_name,
    scoreBefore: lead.stress,
    scoreAfter: afterStress,
    reduction: reductionPercent(lead.stress, afterStress),
    average,
    minutes: sessionMinutes(),
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
