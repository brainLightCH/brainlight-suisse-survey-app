import { supabaseAdmin } from "./supabase-admin";
import type { Phase, RatingValues, StatsBucket, StatsFilters, StatsResponse } from "./types";

interface RatingRow {
  session_id: string;
  phase: Phase;
  participant_number: number;
  stress: number;
  fatigue_nerveuse: number;
  fatigue_physique: number;
  lead_optin: boolean;
}

interface JoinedRow extends RatingRow {
  sessions: { sector: string | null; company_name: string | null } | null;
}

async function fetchRows(filters: StatsFilters): Promise<JoinedRow[]> {
  let query = supabaseAdmin
    .from("responses")
    .select(
      "session_id, phase, participant_number, stress, fatigue_nerveuse, fatigue_physique, lead_optin, sessions!inner(sector, company_name, type, created_at)"
    );

  if (filters.type) query = query.eq("sessions.type", filters.type);
  if (filters.sector) query = query.eq("sessions.sector", filters.sector);
  if (filters.company) query = query.eq("sessions.company_name", filters.company);
  if (filters.from) query = query.gte("sessions.created_at", filters.from);
  if (filters.to) query = query.lte("sessions.created_at", filters.to);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as JoinedRow[];
}

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function computeBucket(rows: RatingRow[]): StatsBucket {
  const sessionIds = new Set(rows.map((r) => r.session_id));

  const byParticipant = new Map<
    string,
    { before?: RatingRow; after?: RatingRow }
  >();
  for (const row of rows) {
    const key = `${row.session_id}:${row.participant_number}`;
    const entry = byParticipant.get(key) ?? {};
    entry[row.phase] = row;
    byParticipant.set(key, entry);
  }

  const matched = [...byParticipant.values()].filter(
    (e): e is { before: RatingRow; after: RatingRow } => Boolean(e.before && e.after)
  );

  const leadsCount = rows.filter((r) => r.phase === "after" && r.lead_optin).length;

  const avgBefore: RatingValues | null = matched.length
    ? {
        stress: average(matched.map((m) => m.before.stress))!,
        fatigue_nerveuse: average(matched.map((m) => m.before.fatigue_nerveuse))!,
        fatigue_physique: average(matched.map((m) => m.before.fatigue_physique))!,
      }
    : null;

  const avgAfter: RatingValues | null = matched.length
    ? {
        stress: average(matched.map((m) => m.after.stress))!,
        fatigue_nerveuse: average(matched.map((m) => m.after.fatigue_nerveuse))!,
        fatigue_physique: average(matched.map((m) => m.after.fatigue_physique))!,
      }
    : null;

  // Percentage change relative to the "before" average, not a raw point
  // difference — e.g. before 8, after 3 → -62.5 (a 62.5% reduction).
  function percentChange(before: number, after: number): number {
    return ((after - before) / before) * 100;
  }

  const delta: RatingValues | null =
    avgBefore && avgAfter
      ? {
          stress: percentChange(avgBefore.stress, avgAfter.stress),
          fatigue_nerveuse: percentChange(
            avgBefore.fatigue_nerveuse,
            avgAfter.fatigue_nerveuse
          ),
          fatigue_physique: percentChange(
            avgBefore.fatigue_physique,
            avgAfter.fatigue_physique
          ),
        }
      : null;

  return {
    session_count: sessionIds.size,
    participant_count: byParticipant.size,
    matched_count: matched.length,
    leads_count: leadsCount,
    avg_before: avgBefore,
    avg_after: avgAfter,
    delta,
  };
}

export async function getStats(filters: StatsFilters): Promise<StatsResponse> {
  const [selectionRows, globalRows] = await Promise.all([
    fetchRows(filters),
    fetchRows({}),
  ]);

  const selection = computeBucket(selectionRows);
  const global = computeBucket(globalRows);

  let sector: (StatsBucket & { sector: string }) | null = null;
  if (filters.company) {
    const sectorValue = selectionRows.find((r) => r.sessions?.sector)?.sessions
      ?.sector;
    if (sectorValue) {
      const sectorRows = await fetchRows({ sector: sectorValue });
      sector = { ...computeBucket(sectorRows), sector: sectorValue };
    }
  }

  return { selection, sector, global };
}
