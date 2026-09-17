import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("company_name")
    .not("company_name", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const companies = Array.from(
    new Set((data ?? []).map((r) => r.company_name as string))
  ).sort();
  return NextResponse.json({ companies });
}
