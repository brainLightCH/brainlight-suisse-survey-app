import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { parseStation } from "@/lib/expo";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ station: string }> }
) {
  const { station: stationParam } = await params;
  const station = parseStation(stationParam);
  if (!station) {
    return NextResponse.json({ error: "invalid_station" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("sessions")
    .update({ phase: "after" })
    .eq("station", station)
    .eq("is_active", true)
    .eq("phase", "before")
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "session_not_found_or_wrong_phase" },
      { status: 409 }
    );
  }
  return NextResponse.json({ session: data });
}
