"use client";

import { useCallback, useEffect, useState } from "react";
import BeforeAfterChart from "@/components/BeforeAfterChart";
import { SECTORS, SESSION_TYPE_LABELS } from "@/lib/constants";
import type { SessionType, StatsResponse } from "@/lib/types";

interface LatestEnergyDays {
  event_name: string;
  company_name: string | null;
  sector: string | null;
  created_at: string;
  closed_at: string | null;
  bucket: StatsResponse["selection"];
}

const METRIC_LABELS: Record<string, string> = {
  stress: "Stress",
  fatigue_nerveuse: "Fatigue nerveuse",
  fatigue_physique: "Fatigue physique",
};

export default function CoachStatsPage() {
  const [type, setType] = useState<SessionType | "">("");
  const [sector, setSector] = useState("");
  const [company, setCompany] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [companies, setCompanies] = useState<string[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [latestEnergyDays, setLatestEnergyDays] =
    useState<LatestEnergyDays | null>(null);

  useEffect(() => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then((j) => setCompanies(j.companies ?? []));

    fetch("/api/stats/latest-energy-days")
      .then((r) => r.json())
      .then((j) => setLatestEnergyDays(j.summary ?? null));
  }, []);

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (sector) params.set("sector", sector);
    if (company) params.set("company", company);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return params;
  }, [type, sector, company, from, to]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stats?${buildParams().toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      setStats(json);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <main className="flex-1 flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-4xl flex flex-col gap-8">
        <h1 className="text-xl font-semibold text-center">
          Consulter mes données
        </h1>

        {latestEnergyDays && (
          <div className="bg-panel rounded-2xl p-5 flex flex-col gap-4">
            <div>
              <h2 className="font-semibold">
                Dernière Energy Days — {latestEnergyDays.event_name}
              </h2>
              <p className="text-xs text-text-muted mt-1">
                {latestEnergyDays.company_name}
                {latestEnergyDays.sector ? ` · ${latestEnergyDays.sector}` : ""}
                {" · "}
                {new Date(latestEnergyDays.created_at).toLocaleDateString(
                  "fr-CH"
                )}
              </p>
            </div>
            {latestEnergyDays.bucket.avg_before &&
            latestEnergyDays.bucket.avg_after &&
            latestEnergyDays.bucket.delta ? (
              <BeforeAfterChart
                avgBefore={latestEnergyDays.bucket.avg_before}
                avgAfter={latestEnergyDays.bucket.avg_after}
                delta={latestEnergyDays.bucket.delta}
              />
            ) : (
              <p className="text-text-muted text-sm">
                Pas encore assez de données avant/après pour cette séance.
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs text-text-muted">Filtrer les données</p>
          <a
            href={`/api/stats/export?${buildParams().toString()}`}
            className="text-xs font-medium text-accent-light hover:brightness-110 rounded-full bg-panel-raised px-3 py-1.5"
          >
            Exporter CSV
          </a>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-panel rounded-2xl p-4">
          <Field label="Type de séance">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as SessionType | "")}
              className="rounded-xl bg-panel-raised px-3 py-2 text-text text-sm outline-none"
            >
              <option value="">Tous</option>
              {(Object.keys(SESSION_TYPE_LABELS) as SessionType[]).map(
                (t) => (
                  <option key={t} value={t}>
                    {SESSION_TYPE_LABELS[t]}
                  </option>
                )
              )}
            </select>
          </Field>

          <Field label="Secteur">
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="rounded-xl bg-panel-raised px-3 py-2 text-text text-sm outline-none"
            >
              <option value="">Tous</option>
              {SECTORS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Entreprise">
            <input
              list="companies"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Toutes"
              className="rounded-xl bg-panel-raised px-3 py-2 text-text text-sm outline-none placeholder:text-text-muted"
            />
            <datalist id="companies">
              {companies.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>

          <Field label="Du">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-xl bg-panel-raised px-3 py-2 text-text text-sm outline-none"
            />
          </Field>

          <Field label="Au">
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-xl bg-panel-raised px-3 py-2 text-text text-sm outline-none"
            />
          </Field>
        </div>

        {loading && !stats && (
          <p className="text-text-muted text-center">Chargement…</p>
        )}

        {stats && (
          <div className="flex flex-col gap-6">
            {stats.sector ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <BucketCard
                  title={company || "Entreprise"}
                  bucket={stats.selection}
                />
                <BucketCard
                  title={`Secteur : ${stats.sector.sector}`}
                  bucket={stats.sector}
                />
                <BucketCard title="Moyenne globale" bucket={stats.global} />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <BucketCard title="Sélection filtrée" bucket={stats.selection} />
                <BucketCard title="Moyenne globale" bucket={stats.global} />
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-text-muted">{label}</label>
      {children}
    </div>
  );
}

function BucketCard({
  title,
  bucket,
}: {
  title: string;
  bucket: StatsResponse["selection"];
}) {
  return (
    <div className="bg-panel rounded-2xl p-5 flex flex-col gap-4">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-xs text-text-muted mt-1">
          Basé sur {bucket.session_count} séance
          {bucket.session_count > 1 ? "s" : ""} · {bucket.participant_count}{" "}
          participant{bucket.participant_count > 1 ? "s" : ""}
        </p>
      </div>

      {bucket.avg_before && bucket.avg_after && bucket.delta ? (
        <div className="flex flex-col gap-3">
          {(["stress", "fatigue_nerveuse", "fatigue_physique"] as const).map(
            (metric) => (
              <div key={metric}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{METRIC_LABELS[metric]}</span>
                  <span
                    className={`font-mono ${
                      bucket.delta![metric] <= 0
                        ? "text-success"
                        : "text-accent-energy"
                    }`}
                  >
                    {bucket.delta![metric] > 0 ? "+" : ""}
                    {bucket.delta![metric].toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted font-mono">
                  <span>{bucket.avg_before![metric].toFixed(1)}</span>
                  <span>→</span>
                  <span className="text-text">
                    {bucket.avg_after![metric].toFixed(1)}
                  </span>
                </div>
              </div>
            )
          )}
        </div>
      ) : (
        <p className="text-text-muted text-sm">
          Pas encore assez de données avant/après.
        </p>
      )}

      <p className="text-sm text-text-muted border-t border-panel-raised pt-3">
        {bucket.leads_count} lead{bucket.leads_count > 1 ? "s" : ""} récolté
        {bucket.leads_count > 1 ? "s" : ""}
      </p>
    </div>
  );
}
