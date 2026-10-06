import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { parseStation } from "@/lib/expo";
import { computeBucket } from "@/lib/stats";
import { sendExpoResultsEmail } from "@/lib/email/results";
import type { Session } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ station: string }> }
) {
  const { station: stationParam } = await params;
  const station = parseStation(stationParam);
  if (!station) {
    return NextResponse.json({ error: "invalid_station" }, { status: 400 });
  }

  const body = await request.json();
  const { lang, stress, fatigue_nerveuse, fatigue_physique } = body;

  const ratingsValid = [stress, fatigue_nerveuse, fatigue_physique].every(
    (v) => Number.isInteger(v) && v >= 1 && v <= 10
  );
  if (!ratingsValid || !["fr", "de"].includes(lang)) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { data: session, error: sessionError } = await supabaseAdmin
    .from("sessions")
    .select("*")
    .eq("station", station)
    .eq("is_active", true)
    .eq("phase", "after")
    .maybeSingle();

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }
  if (!session) {
    return NextResponse.json({ error: "session_not_found" }, { status: 409 });
  }

  const { error: responseError } = await supabaseAdmin.from("responses").insert({
    session_id: session.id,
    phase: "after",
    participant_number: 1,
    stress,
    fatigue_nerveuse,
    fatigue_physique,
    lead_optin: false,
    lang,
  });

  if (responseError) {
    return NextResponse.json({ error: responseError.message }, { status: 500 });
  }

  const { data: responses, error: responsesError } = await supabaseAdmin
    .from("responses")
    .select(
      "session_id, phase, participant_number, stress, fatigue_nerveuse, fatigue_physique, lead_optin"
    )
    .eq("session_id", session.id);

  if (responsesError) {
    return NextResponse.json({ error: responsesError.message }, { status: 500 });
  }

  const bucket = computeBucket(responses ?? []);

  await supabaseAdmin.from("history").insert({
    session_id: session.id,
    type: session.type,
    event_name: session.event_name,
    company_name: session.company_name,
    sector: session.sector,
    matched_count: bucket.matched_count,
    leads_count: bucket.leads_count,
    delta_stress: bucket.delta?.stress ?? null,
    delta_fatigue_nerveuse: bucket.delta?.fatigue_nerveuse ?? null,
    delta_fatigue_physique: bucket.delta?.fatigue_physique ?? null,
  });

  await supabaseAdmin
    .from("sessions")
    .update({ is_active: false, closed_at: new Date().toISOString() })
    .eq("id", session.id);

  // Everything is saved at this point; a failed email must never undo or
  // block that, so it's reported back as a flag rather than an error.
  let emailSent = false;
  try {
    emailSent = await sendExpoResultsEmail({
      session: session as Session,
      afterStress: stress,
      baseUrl: new URL(request.url).origin,
    });
  } catch (e) {
    console.error("[results-email] unexpected failure:", e);
  }

  return NextResponse.json({ ok: true, email_sent: emailSent });
}
