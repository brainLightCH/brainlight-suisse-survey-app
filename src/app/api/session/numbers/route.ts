import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(request: Request) {
  const { session_id, active_numbers } = await request.json();
  if (!session_id || !Array.isArray(active_numbers)) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("sessions")
    .update({ active_numbers })
    .eq("id", session_id)
    .eq("is_active", true)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "session_not_found" }, { status: 409 });
  }
  return NextResponse.json({ session: data });
}
