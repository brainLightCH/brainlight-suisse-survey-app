import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const session_id = searchParams.get("session_id");
  if (!session_id) {
    return NextResponse.json({ error: "missing_session_id" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("responses")
    .select(
      "id, phase, participant_number, stress, fatigue_nerveuse, fatigue_physique, lead_optin, created_at"
    )
    .eq("session_id", session_id)
    .order("participant_number", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ responses: data ?? [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  const {
    session_id,
    phase,
    participant_number,
    stress,
    fatigue_nerveuse,
    fatigue_physique,
    lead_optin,
    usage_likelihood,
    prenom,
    nom,
    email,
    telephone,
    entreprise,
  } = body;

  const ratingsValid = [stress, fatigue_nerveuse, fatigue_physique].every(
    (v) => Number.isInteger(v) && v >= 1 && v <= 10
  );
  const usageLikelihoodValid =
    usage_likelihood === undefined ||
    (Number.isInteger(usage_likelihood) &&
      usage_likelihood >= 0 &&
      usage_likelihood <= 10);

  if (
    !session_id ||
    !["before", "after"].includes(phase) ||
    !Number.isInteger(participant_number) ||
    !ratingsValid ||
    !usageLikelihoodValid
  ) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { data: session, error: sessionError } = await supabaseAdmin
    .from("sessions")
    .select("id, phase, is_active")
    .eq("id", session_id)
    .maybeSingle();

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }
  if (!session || !session.is_active || session.phase !== phase) {
    return NextResponse.json({ error: "session_changed" }, { status: 409 });
  }

  const isLead = phase === "after" && Boolean(lead_optin);

  const { data, error } = await supabaseAdmin
    .from("responses")
    .upsert(
      {
        session_id,
        phase,
        participant_number,
        stress,
        fatigue_nerveuse,
        fatigue_physique,
        lead_optin: isLead,
        usage_likelihood:
          usage_likelihood === undefined ? null : usage_likelihood,
        prenom: isLead ? prenom ?? null : null,
        nom: isLead ? nom ?? null : null,
        email: isLead ? email ?? null : null,
        telephone: isLead ? telephone ?? null : null,
        entreprise: isLead ? entreprise ?? null : null,
      },
      { onConflict: "session_id,phase,participant_number" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ response: data });
}
