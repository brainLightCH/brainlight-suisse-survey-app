import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { parseStation, expoEventName } from "@/lib/expo";

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
  const {
    lang,
    prenom,
    nom,
    email,
    telephone,
    entreprise,
    adresse,
    consent,
    stress,
    fatigue_nerveuse,
    fatigue_physique,
  } = body;

  const ratingsValid = [stress, fatigue_nerveuse, fatigue_physique].every(
    (v) => Number.isInteger(v) && v >= 1 && v <= 10
  );

  if (
    !ratingsValid ||
    consent !== true ||
    !prenom?.trim() ||
    !nom?.trim() ||
    !email?.trim() ||
    !telephone?.trim() ||
    !entreprise?.trim() ||
    !adresse?.trim() ||
    !["fr", "de"].includes(lang)
  ) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("sessions")
    .select("id")
    .eq("is_active", true)
    .eq("station", station)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }
  if (existing) {
    return NextResponse.json({ error: "station_busy" }, { status: 409 });
  }

  const { data: session, error: sessionError } = await supabaseAdmin
    .from("sessions")
    .insert({
      type: "expo",
      event_name: expoEventName(),
      phase: "before",
      active_numbers: [1],
      is_active: true,
      station,
    })
    .select()
    .single();

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }

  const { error: responseError } = await supabaseAdmin.from("responses").insert({
    session_id: session.id,
    phase: "before",
    participant_number: 1,
    stress,
    fatigue_nerveuse,
    fatigue_physique,
    lead_optin: true,
    prenom: prenom.trim(),
    nom: nom.trim(),
    email: email.trim(),
    telephone: telephone.trim(),
    entreprise: entreprise?.trim() || null,
    adresse: adresse.trim(),
    lang,
  });

  if (responseError) {
    // Roll back the session so the station doesn't stay stuck on a
    // half-written attempt.
    await supabaseAdmin.from("sessions").delete().eq("id", session.id);
    return NextResponse.json({ error: responseError.message }, { status: 500 });
  }

  return NextResponse.json({ session });
}
