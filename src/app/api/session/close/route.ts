import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { computeBucket } from "@/lib/stats";

export async function POST(request: Request) {
  const { session_id } = await request.json();
  if (!session_id) {
    return NextResponse.json({ error: "missing_session_id" }, { status: 400 });
  }

  const { data: session, error: sessionError } = await supabaseAdmin
    .from("sessions")
    .select("*")
    .eq("id", session_id)
    .eq("is_active", true)
    .maybeSingle();

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }
  if (!session) {
    return NextResponse.json({ error: "session_not_found" }, { status: 409 });
  }

  const { data: responses, error: responsesError } = await supabaseAdmin
    .from("responses")
    .select(
      "session_id, phase, participant_number, stress, fatigue_nerveuse, fatigue_physique, lead_optin"
    )
    .eq("session_id", session_id);

  if (responsesError) {
    return NextResponse.json({ error: responsesError.message }, { status: 500 });
  }

  const bucket = computeBucket(responses ?? []);

  const { error: historyError } = await supabaseAdmin.from("history").insert({
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
    notes: session.notes,
  });

  if (historyError) {
    return NextResponse.json({ error: historyError.message }, { status: 500 });
  }

  const { error: closeError } = await supabaseAdmin
    .from("sessions")
    .update({ is_active: false, closed_at: new Date().toISOString() })
    .eq("id", session_id);

  if (closeError) {
    return NextResponse.json({ error: closeError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, summary: bucket });
}
