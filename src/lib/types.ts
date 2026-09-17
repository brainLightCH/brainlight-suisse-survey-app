export type SessionType = "showcase" | "event" | "energy_days";
export type Phase = "before" | "after";

export interface Session {
  id: string;
  type: SessionType;
  event_name: string;
  company_name: string | null;
  sector: string | null;
  phase: Phase;
  active_numbers: number[];
  is_active: boolean;
  created_at: string;
  closed_at: string | null;
}

export interface ResponseRow {
  id: string;
  session_id: string;
  phase: Phase;
  participant_number: number;
  stress: number;
  fatigue_nerveuse: number;
  fatigue_physique: number;
  lead_optin: boolean;
  prenom: string | null;
  nom: string | null;
  email: string | null;
  telephone: string | null;
  entreprise: string | null;
  created_at: string;
}

export interface HistoryRow {
  id: string;
  session_id: string;
  type: SessionType;
  event_name: string;
  company_name: string | null;
  sector: string | null;
  closed_at: string;
  matched_count: number;
  leads_count: number;
  delta_stress: number | null;
  delta_fatigue_nerveuse: number | null;
  delta_fatigue_physique: number | null;
}

export interface RatingValues {
  stress: number;
  fatigue_nerveuse: number;
  fatigue_physique: number;
}

export interface StatsFilters {
  type?: SessionType;
  sector?: string;
  company?: string;
  from?: string;
  to?: string;
}

export interface StatsBucket {
  session_count: number;
  participant_count: number;
  matched_count: number;
  leads_count: number;
  avg_before: RatingValues | null;
  avg_after: RatingValues | null;
  delta: RatingValues | null;
}

export interface StatsResponse {
  selection: StatsBucket;
  sector: (StatsBucket & { sector: string }) | null;
  global: StatsBucket;
}
