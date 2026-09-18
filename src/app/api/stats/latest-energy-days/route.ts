import { NextResponse } from "next/server";
import { getLatestEnergyDaysSummary } from "@/lib/stats";

export async function GET() {
  try {
    const summary = await getLatestEnergyDaysSummary();
    return NextResponse.json({ summary });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "unknown_error" },
      { status: 500 }
    );
  }
}
