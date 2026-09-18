import { getExportRows } from "@/lib/stats";
import type { SessionType } from "@/lib/types";

const COLUMNS: [string, string][] = [
  ["event_name", "Événement"],
  ["type", "Type"],
  ["company_name", "Entreprise"],
  ["sector", "Secteur"],
  ["created_at", "Date"],
  ["participant_number", "Participant n°"],
  ["stress_before", "Stress avant"],
  ["stress_after", "Stress après"],
  ["fatigue_nerveuse_before", "Fatigue nerveuse avant"],
  ["fatigue_nerveuse_after", "Fatigue nerveuse après"],
  ["fatigue_physique_before", "Fatigue physique avant"],
  ["fatigue_physique_after", "Fatigue physique après"],
  ["lead_optin", "Lead"],
  ["usage_likelihood", "Probabilité d'utilisation"],
];

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[;"\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as SessionType | null;
  const sector = searchParams.get("sector");
  const company = searchParams.get("company");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  try {
    const rows = await getExportRows({
      type: type ?? undefined,
      sector: sector ?? undefined,
      company: company ?? undefined,
      from: from ?? undefined,
      to: to ?? undefined,
    });

    const lines = [
      COLUMNS.map(([, label]) => csvCell(label)).join(";"),
      ...rows.map((row) =>
        COLUMNS.map(([key]) =>
          csvCell((row as unknown as Record<string, unknown>)[key])
        ).join(";")
      ),
    ];

    const csv = "﻿" + lines.join("\r\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="brainlight-export-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown_error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
