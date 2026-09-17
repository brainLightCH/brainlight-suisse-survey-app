import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const { session_id } = await request.json();
  if (!session_id) {
    return NextResponse.json({ error: "missing_session_id" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("sessions")
    .update({ phase: "after" })
    .eq("id", session_id)
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
