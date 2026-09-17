"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/Button";
import {
  SECTORS,
  SESSION_TYPE_DESCRIPTIONS,
  SESSION_TYPE_LABELS,
  SESSION_TYPE_MAX_PARTICIPANTS,
} from "@/lib/constants";
import type { Session, SessionType } from "@/lib/types";

export default function CoachSessionPage() {
  const [session, setSession] = useState<Session | null | undefined>(
    undefined
  );

  const fetchActive = useCallback(async () => {
    const res = await fetch("/api/session/active", { cache: "no-store" });
    const json = await res.json();
    setSession(json.session);
  }, []);

  useEffect(() => {
    fetchActive();
    const interval = setInterval(fetchActive, 3000);
    return () => clearInterval(interval);
  }, [fetchActive]);

  if (session === undefined) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-text-muted">Chargement…</p>
      </main>
    );
  }

  if (!session) {
    return <CreateSessionForm onCreated={setSession} />;
  }

  return <LiveSession session={session} onChange={setSession} />;
}

function CreateSessionForm({
  onCreated,
}: {
  onCreated: (s: Session) => void;
}) {
  const [type, setType] = useState<SessionType>("showcase");
  const [eventName, setEventName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [sector, setSector] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          event_name: eventName,
          ...(type === "energy_days"
            ? { company_name: companyName, sector }
            : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Une erreur est survenue.");
        return;
      }
      onCreated(json.session);
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    eventName.trim().length > 0 &&
    (type !== "energy_days" || (companyName.trim().length > 0 && sector));

  return (
    <main className="flex-1 flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-md flex flex-col gap-6">
        <h1 className="text-xl font-semibold text-center">
          Créer une séance
        </h1>

        <div className="flex flex-col gap-3">
          {(Object.keys(SESSION_TYPE_LABELS) as SessionType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`text-left rounded-2xl px-5 py-4 border transition ${
                type === t
                  ? "border-accent-light bg-panel-raised"
                  : "border-transparent bg-panel"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {SESSION_TYPE_LABELS[t]}
                </span>
                <span className="font-mono text-sm text-accent-light">
                  {SESSION_TYPE_MAX_PARTICIPANTS[t]} max
                </span>
              </div>
              <p className="text-text-muted text-sm mt-1">
                {SESSION_TYPE_DESCRIPTIONS[t]}
              </p>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-text-muted">
            Nom de l&apos;événement
          </label>
          <input
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="Ex. Salon Santé Genève"
            className="rounded-xl bg-panel-raised px-4 py-3 text-text placeholder:text-text-muted outline-none focus:ring-2 focus:ring-accent-light"
          />
        </div>

        {type === "energy_days" && (
          <>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-text-muted">
                Nom de l&apos;entreprise
              </label>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex. SIG"
                className="rounded-xl bg-panel-raised px-4 py-3 text-text placeholder:text-text-muted outline-none focus:ring-2 focus:ring-accent-light"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-text-muted">
                Secteur d&apos;activité
              </label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="rounded-xl bg-panel-raised px-4 py-3 text-text outline-none focus:ring-2 focus:ring-accent-light"
              >
                <option value="">Sélectionner…</option>
                {SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {error && <p className="text-danger text-sm">{error}</p>}

        <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
          {submitting ? "Création…" : "Créer la séance"}
        </Button>
      </div>
    </main>
  );
}

function LiveSession({
  session,
  onChange,
}: {
  session: Session;
  onChange: (s: Session | null) => void;
}) {
  const [responded, setResponded] = useState<Set<number>>(new Set());
  const [beforeResponded, setBeforeResponded] = useState<Set<number>>(
    new Set()
  );
  const [confirmClose, setConfirmClose] = useState(false);
  const [busy, setBusy] = useState(false);
  const [togglingNumber, setTogglingNumber] = useState<number | null>(null);

  const allNumbers = Array.from(
    { length: SESSION_TYPE_MAX_PARTICIPANTS[session.type] },
    (_, i) => i + 1
  );
  const activeSet = new Set(session.active_numbers);

  async function toggleNumber(n: number) {
    if (togglingNumber !== null) return;
    const isActive = activeSet.has(n);
    // Once the after phase has started, a number that never answered
    // "before" can't be turned back on — it would never produce a
    // matched pair, so the data would stay incomplete.
    if (!isActive && session.phase === "after" && !beforeResponded.has(n)) {
      return;
    }
    const next = isActive
      ? session.active_numbers.filter((x) => x !== n)
      : [...session.active_numbers, n].sort((a, b) => a - b);
    setTogglingNumber(n);
    try {
      const res = await fetch("/api/session/numbers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.id,
          active_numbers: next,
        }),
      });
      const json = await res.json();
      if (res.ok) onChange(json.session);
    } finally {
      setTogglingNumber(null);
    }
  }

  const fetchResponses = useCallback(async () => {
    const res = await fetch(`/api/responses?session_id=${session.id}`, {
      cache: "no-store",
    });
    const json = await res.json();
    const all: { phase: string; participant_number: number }[] =
      json.responses ?? [];
    setResponded(
      new Set(
        all
          .filter((r) => r.phase === session.phase)
          .map((r) => r.participant_number)
      )
    );
    setBeforeResponded(
      new Set(
        all
          .filter((r) => r.phase === "before")
          .map((r) => r.participant_number)
      )
    );
  }, [session.id, session.phase]);

  useEffect(() => {
    fetchResponses();
    const interval = setInterval(fetchResponses, 3000);
    return () => clearInterval(interval);
  }, [fetchResponses]);

  async function handleStart() {
    setBusy(true);
    try {
      const res = await fetch("/api/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: session.id }),
      });
      const json = await res.json();
      if (res.ok) onChange(json.session);
    } finally {
      setBusy(false);
    }
  }

  async function handleClose() {
    setBusy(true);
    try {
      const res = await fetch("/api/session/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: session.id }),
      });
      if (res.ok) onChange(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold">{session.event_name}</h1>
          <p className="text-text-muted text-sm mt-1">
            {SESSION_TYPE_LABELS[session.type]}
            {session.company_name ? ` — ${session.company_name}` : ""}
          </p>
          <p className="font-mono text-sm text-accent-light mt-2 uppercase tracking-wide">
            Phase : {session.phase === "before" ? "Avant" : "Après"}
          </p>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {allNumbers.map((n) => {
            const active = activeSet.has(n);
            const done = active && responded.has(n);
            const locked =
              !active && session.phase === "after" && !beforeResponded.has(n);
            return (
              <button
                key={n}
                onClick={() => toggleNumber(n)}
                disabled={togglingNumber !== null || locked}
                className={`aspect-square rounded-xl flex items-center justify-center font-mono text-lg font-semibold transition disabled:cursor-not-allowed ${
                  done
                    ? "bg-success/20 text-success border border-success"
                    : active
                    ? "bg-panel-raised text-text-muted hover:brightness-110"
                    : locked
                    ? "bg-transparent text-text-muted/10 border border-dashed border-panel-raised/40"
                    : "bg-transparent text-text-muted/30 border border-dashed border-panel-raised hover:text-text-muted/60"
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
        <p className="text-text-muted text-xs text-center -mt-3">
          Clique sur un numéro pour l&apos;activer ou le désactiver
        </p>
        <p className="text-text-muted text-sm text-center">
          {[...responded].filter((n) => activeSet.has(n)).length} /{" "}
          {activeSet.size} réponses reçues
        </p>

        {session.phase === "before" && (
          <Button onClick={handleStart} disabled={busy}>
            Début de la séance
          </Button>
        )}

        {!confirmClose ? (
          <Button
            variant="secondary"
            onClick={() => setConfirmClose(true)}
            disabled={busy}
          >
            Fermer le questionnaire
          </Button>
        ) : (
          <div className="flex flex-col gap-3 bg-panel rounded-2xl p-4">
            <p className="text-sm text-text-muted text-center">
              Confirmer la fermeture ? Cette action est définitive.
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setConfirmClose(false)}
                disabled={busy}
              >
                Annuler
              </Button>
              <Button variant="danger" onClick={handleClose} disabled={busy}>
                Confirmer
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
