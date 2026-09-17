import { NextResponse } from "next/server";
import { getStats } from "@/lib/stats";
import type { SessionType } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as SessionType | null;
  const sector = searchParams.get("sector");
  const company = searchParams.get("company");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  try {
    const stats = await getStats({
      type: type ?? undefined,
      sector: sector ?? undefined,
      company: company ?? undefined,
      from: from ?? undefined,
      to: to ?? undefined,
    });
    return NextResponse.json(stats);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "unknown_error" },
      { status: 500 }
    );
  }
}
