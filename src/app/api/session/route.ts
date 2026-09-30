import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { SECTORS, SESSION_TYPE_MAX_PARTICIPANTS } from "@/lib/constants";
import type { SessionType } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json();
  const { type, event_name, company_name, sector } = body as {
    type: SessionType;
    event_name: string;
    company_name?: string;
    sector?: string;
  };

  if (!type || !["showcase", "event", "energy_days"].includes(type)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }
  if (!event_name?.trim()) {
    return NextResponse.json({ error: "missing_event_name" }, { status: 400 });
  }
  if (type === "energy_days") {
    if (!company_name?.trim()) {
      return NextResponse.json(
        { error: "missing_company_name" },
        { status: 400 }
      );
    }
    if (!sector || !(SECTORS as readonly string[]).includes(sector)) {
      return NextResponse.json({ error: "invalid_sector" }, { status: 400 });
    }
  }

  // station = 0 is the coach-driven "single active session" slot — expo
  // stations (1-4) have their own independent active sessions and must
  // never block or be confused with this one.
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("sessions")
    .select("id")
    .eq("is_active", true)
    .eq("station", 0)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }
  if (existing) {
    return NextResponse.json({ error: "session_already_active" }, { status: 409 });
  }

  const max = SESSION_TYPE_MAX_PARTICIPANTS[type];
  const active_numbers = Array.from({ length: max }, (_, i) => i + 1);

  const { data, error } = await supabaseAdmin
    .from("sessions")
    .insert({
      type,
      event_name: event_name.trim(),
      company_name: type === "energy_days" ? company_name!.trim() : null,
      sector: type === "energy_days" ? sector : null,
      phase: "before",
      active_numbers,
      is_active: true,
      station: 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ session: data });
}
