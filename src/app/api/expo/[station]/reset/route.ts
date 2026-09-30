import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { parseStation } from "@/lib/expo";

// Staff-facing escape hatch: wipes whatever in-progress data exists for a
// station (session + its responses) without saving anything, so the chair
// is immediately free for the next visitor. Used when someone starts a
// session and never comes back to finish it.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ station: string }> }
) {
  const { station: stationParam } = await params;
  const station = parseStation(stationParam);
  if (!station) {
    return NextResponse.json({ error: "invalid_station" }, { status: 400 });
  }

  const { data: session, error: sessionError } = await supabaseAdmin
    .from("sessions")
    .select("id")
    .eq("is_active", true)
    .eq("station", station)
    .maybeSingle();

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }
  if (session) {
    await supabaseAdmin.from("responses").delete().eq("session_id", session.id);
    await supabaseAdmin.from("sessions").delete().eq("id", session.id);
  }

  return NextResponse.json({ ok: true });
}
