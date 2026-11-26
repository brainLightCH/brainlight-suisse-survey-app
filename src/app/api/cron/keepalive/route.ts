import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Called once a day by Vercel Cron (see vercel.json). The free Supabase plan
// pauses a project after about a week without activity, which breaks every
// form and the coach space. One tiny read a day keeps it awake.
//
// When CRON_SECRET is set in Vercel, Vercel sends it as a Bearer token and
// any other caller is refused. It exposes no data either way.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { error } = await supabaseAdmin
    .from("sessions")
    .select("id", { head: true, count: "exact" })
    .limit(1);

  if (error) {
    console.error("[keepalive] database read failed:", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
