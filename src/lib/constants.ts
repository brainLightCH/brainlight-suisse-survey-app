import type { SessionType } from "./types";

export const SECTORS = [
  "Santé et social",
  "Finance et assurance",
  "Industrie et production",
  "Construction et immobilier",
  "Commerce et distribution",
  "Technologie et IT",
  "Services aux entreprises",
  "Secteur public et administration",
  "Éducation et formation",
  "Autre",
] as const;

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  showcase: "Showcase",
  event: "Event",
  energy_days: "Energy Days",
};

export const SESSION_TYPE_MAX_PARTICIPANTS: Record<SessionType, number> = {
  showcase: 1,
  event: 4,
  energy_days: 15,
};

export const SESSION_TYPE_DESCRIPTIONS: Record<SessionType, string> = {
  showcase: "1 participant — présentation en tête-à-tête",
  event: "Jusqu'à 4 participants — salon, stand, petit groupe",
  energy_days: "Jusqu'à 15 participants — workshop en entreprise",
};
