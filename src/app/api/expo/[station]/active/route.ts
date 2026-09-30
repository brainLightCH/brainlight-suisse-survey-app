import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { parseStation } from "@/lib/expo";

export async function GET(
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
    .select("*")
    .eq("is_active", true)
    .eq("station", station)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ session: data });
}
