"use client";

import { useCallback, useEffect, useState } from "react";
import NumberGrid from "@/components/NumberGrid";
import ParticipantForm from "@/components/ParticipantForm";
import { SESSION_TYPE_LABELS } from "@/lib/constants";
import type { Session } from "@/lib/types";

type ViewState = "loading" | "no_session" | "pick_number" | "form" | "done";

export default function ParticipantPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<ViewState>("loading");
  const [participantNumber, setParticipantNumber] = useState<number | null>(
    null
  );
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);
  const [lastPhase, setLastPhase] = useState<string | null>(null);
  const [sessionChanged, setSessionChanged] = useState(false);

  const fetchActive = useCallback(async () => {
    try {
      const res = await fetch("/api/session/active", { cache: "no-store" });
      const json = await res.json();
      const active: Session | null = json.session;
      setSession(active);

      if (!active) {
        setView("no_session");
        return;
      }

      if (
        (view === "form" || view === "done") &&
        lastSessionId &&
        (active.id !== lastSessionId || active.phase !== lastPhase)
      ) {
        setSessionChanged(true);
        return;
      }

      if (view === "loading" || view === "no_session") {
        setView(active.type === "showcase" ? "form" : "pick_number");
        if (active.type === "showcase") {
          setParticipantNumber(1);
          setLastSessionId(active.id);
          setLastPhase(active.phase);
        }
      }
    } catch {
      // Network hiccup on a mobile connection: keep last known state,
      // the next poll will retry.
    }
  }, [view, lastSessionId, lastPhase]);

  useEffect(() => {
    fetchActive();
    const interval = setInterval(fetchActive, 3000);
    return () => clearInterval(interval);
  }, [fetchActive]);

  function restart() {
    setSessionChanged(false);
    setParticipantNumber(null);
    setLastSessionId(null);
    setLastPhase(null);
    setView("loading");
    fetchActive();
  }

  if (sessionChanged) {
    return (
      <Centered>
        <p className="text-lg text-center mb-6">
          Le questionnaire a changé. Merci de recommencer.
        </p>
        <button
          onClick={restart}
          className="rounded-2xl bg-accent-light text-[#10142a] px-6 py-3 font-semibold"
        >
          Recommencer
        </button>
      </Centered>
    );
  }

  if (view === "loading") {
    return (
      <Centered>
        <p className="text-text-muted">Chargement…</p>
      </Centered>
    );
  }

  if (view === "no_session" || !session) {
    return (
      <Centered>
        <p className="text-lg text-center">
          Aucune séance en cours pour le moment.
        </p>
        <p className="text-text-muted text-sm text-center mt-2">
          Merci de patienter, votre coach brainLight va bientôt démarrer.
        </p>
      </Centered>
    );
  }

  if (view === "pick_number") {
    return (
      <Centered>
        <h1 className="text-xl font-semibold mb-1 text-center">
          {SESSION_TYPE_LABELS[session.type]}
        </h1>
        <p className="text-text-muted text-sm mb-6 text-center">
          Sélectionnez votre numéro
        </p>
        <NumberGrid
          numbers={session.active_numbers}
          onSelect={(n) => {
            setParticipantNumber(n);
            setLastSessionId(session.id);
            setLastPhase(session.phase);
            setView("form");
          }}
        />
      </Centered>
    );
  }

  if (view === "form" && participantNumber !== null) {
    return (
      <Centered>
        <h1 className="text-xl font-semibold mb-6 text-center">
          {session.phase === "before" ? "Avant la séance" : "Après la séance"}
        </h1>
        <ParticipantForm
          sessionId={session.id}
          phase={session.phase}
          participantNumber={participantNumber}
          onSubmitted={() => setView("done")}
        />
      </Centered>
    );
  }

  if (view === "done") {
    return (
      <Centered>
        <p className="text-2xl mb-2">✓</p>
        <p className="text-lg text-center">Merci !</p>
        <p className="text-text-muted text-sm text-center mt-2">
          Vos réponses ont bien été enregistrées.
        </p>
      </Centered>
    );
  }

  return null;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      {children}
    </main>
  );
}
