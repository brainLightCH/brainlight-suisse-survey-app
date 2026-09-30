"use client";

import { useCallback, useEffect, useState } from "react";
import Footer from "@/components/Footer";
import NumberGrid from "@/components/NumberGrid";
import ParticipantForm from "@/components/ParticipantForm";
import { SESSION_TYPE_LABELS } from "@/lib/constants";
import { translations, type Lang } from "@/lib/i18n";
import type { Session } from "@/lib/types";

type ViewState = "loading" | "no_session" | "pick_number" | "form" | "done";

interface StoredSubmission {
  sessionId: string;
  phase: string;
  participantNumber: number;
}

const SUBMISSION_STORAGE_KEY = "bl_last_submission";

function readStoredSubmission(): StoredSubmission | null {
  try {
    const raw = window.localStorage.getItem(SUBMISSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSubmission) : null;
  } catch {
    return null;
  }
}

function writeStoredSubmission(submission: StoredSubmission) {
  try {
    window.localStorage.setItem(
      SUBMISSION_STORAGE_KEY,
      JSON.stringify(submission)
    );
  } catch {
    // Private browsing or storage disabled: the confirmation screen just
    // won't survive a refresh, which is no worse than before this feature.
  }
}

export default function ParticipantPage() {
  const [lang, setLang] = useState<Lang | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<ViewState>("loading");
  const [participantNumber, setParticipantNumber] = useState<number | null>(
    null
  );
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);
  const [lastPhase, setLastPhase] = useState<string | null>(null);
  const [sessionChanged, setSessionChanged] = useState(false);
  const [beforeNumbers, setBeforeNumbers] = useState<number[]>([]);
  const [respondedNumbers, setRespondedNumbers] = useState<number[]>([]);

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
        // Only Showcase is a single participant on a single device — a
        // refresh there should resume "Merci !" instead of a blank form.
        // Event/Energy Days share one phone across many participants, so
        // remembering "done" by session+phase alone would wrongly block
        // the next person: the number grid (with already-answered numbers
        // greyed out) is what prevents re-submitting a taken number there.
        if (active.type === "showcase") {
          const stored = readStoredSubmission();
          if (
            stored &&
            stored.sessionId === active.id &&
            stored.phase === active.phase
          ) {
            setParticipantNumber(stored.participantNumber);
            setLastSessionId(active.id);
            setLastPhase(active.phase);
            setView("done");
            return;
          }
        }

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

  useEffect(() => {
    if (view !== "pick_number" || !session) {
      return;
    }
    fetch(`/api/responses?session_id=${session.id}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        const responses: { phase: string; participant_number: number }[] =
          json.responses ?? [];
        setBeforeNumbers(
          responses
            .filter((r) => r.phase === "before")
            .map((r) => r.participant_number)
        );
        setRespondedNumbers(
          responses
            .filter((r) => r.phase === session.phase)
            .map((r) => r.participant_number)
        );
      })
      .catch(() => {
        // Keep last known list; grid just stays as-is until the next try.
      });
  }, [view, session]);

  function restart() {
    // Only reset state here — the polling effect depends on fetchActive,
    // which is recreated once view/lastSessionId/lastPhase settle, and it
    // will run the fresh fetch itself. Calling fetchActive() directly here
    // would reuse this render's stale closure and re-trigger the "changed"
    // state immediately.
    setSessionChanged(false);
    setParticipantNumber(null);
    setLastSessionId(null);
    setLastPhase(null);
    setView("loading");
  }

  if (!lang) {
    return <LanguageSelect onSelect={setLang} />;
  }

  const t = translations[lang];

  if (sessionChanged) {
    return (
      <Centered lang={lang}>
        <p className="text-lg text-center mb-6">{t.sessionChanged}</p>
        <button
          onClick={restart}
          className="rounded-2xl bg-accent-light text-[#10142a] px-6 py-3 font-semibold"
        >
          {t.restart}
        </button>
      </Centered>
    );
  }

  if (view === "loading") {
    return (
      <Centered lang={lang}>
        <p className="text-text-muted">{t.loading}</p>
      </Centered>
    );
  }

  if (view === "no_session" || !session) {
    return (
      <Centered lang={lang}>
        <p className="text-lg text-center">{t.noSession}</p>
        <p className="text-text-muted text-sm text-center mt-2">
          {t.noSessionSub}
        </p>
      </Centered>
    );
  }

  if (view === "pick_number") {
    const notEligible =
      session.phase === "after"
        ? session.active_numbers.filter((n) => !beforeNumbers.includes(n))
        : [];
    const disabledNumbers = Array.from(
      new Set([...notEligible, ...respondedNumbers])
    );

    return (
      <Centered lang={lang}>
        <h1 className="text-xl font-semibold mb-1 text-center">
          {SESSION_TYPE_LABELS[session.type]}
        </h1>
        <p className="text-text-muted text-sm mb-6 text-center">
          {t.selectNumber}
        </p>
        <NumberGrid
          numbers={session.active_numbers}
          disabledNumbers={disabledNumbers}
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
      <Centered lang={lang}>
        <span className="inline-flex items-center gap-2 rounded-full bg-panel-raised text-accent-light text-xs font-mono uppercase tracking-wide px-3 py-1 mb-4">
          {session.type !== "showcase" && (
            <>
              {t.participantNumber}
              {participantNumber}
              <span className="text-text-muted">·</span>
            </>
          )}
          {session.phase === "before" ? t.beforeSession : t.afterSession}
        </span>
        <h1 className="text-2xl font-semibold mb-2 text-center max-w-md">
          {session.phase === "before" ? t.beforeTitle : t.afterTitle}
        </h1>
        <p className="text-text-muted text-sm mb-6 text-center">
          {t.scaleHint}
        </p>
        <ParticipantForm
          sessionId={session.id}
          sessionType={session.type}
          phase={session.phase}
          participantNumber={participantNumber}
          lang={lang}
          onSubmitted={() => {
            writeStoredSubmission({
              sessionId: session.id,
              phase: session.phase,
              participantNumber,
            });
            setView("done");
          }}
        />
      </Centered>
    );
  }

  if (view === "done") {
    return (
      <Centered lang={lang}>
        <p className="text-2xl mb-2">✓</p>
        <p className="text-lg text-center">{t.thankYou}</p>
        <p className="text-text-muted text-sm text-center mt-2">
          {t.savedMessage}
        </p>
        {session.phase === "before" && (
          <p className="text-text-muted text-sm text-center mt-2">
            {t.closeDeviceMessage}
          </p>
        )}
      </Centered>
    );
  }

  return null;
}

function Centered({
  children,
  lang,
}: {
  children: React.ReactNode;
  lang?: Lang;
}) {
  return (
    <>
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {children}
      </main>
      <Footer lang={lang} />
    </>
  );
}

function LanguageSelect({ onSelect }: { onSelect: (lang: Lang) => void }) {
  return (
    <Centered>
      <p className="text-lg text-center mb-8 leading-relaxed">
        Sélectionnez votre langue
        <br />
        Wählen Sie Ihre Sprache
      </p>
      <div className="flex gap-4 w-full max-w-xs">
        <button
          onClick={() => onSelect("fr")}
          className="flex-1 flex flex-col items-center gap-2 rounded-2xl bg-panel-raised px-4 py-6 hover:brightness-110 transition"
        >
          <FlagFr className="w-12 h-8 rounded" />
          <span className="text-sm font-medium">Français</span>
        </button>
        <button
          onClick={() => onSelect("de")}
          className="flex-1 flex flex-col items-center gap-2 rounded-2xl bg-panel-raised px-4 py-6 hover:brightness-110 transition"
        >
          <FlagDe className="w-12 h-8 rounded" />
          <span className="text-sm font-medium">Deutsch</span>
        </button>
      </div>
    </Centered>
  );
}

function FlagFr({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 3 2" className={className} aria-hidden="true">
      <rect width="1" height="2" x="0" fill="#0055A4" />
      <rect width="1" height="2" x="1" fill="#FFFFFF" />
      <rect width="1" height="2" x="2" fill="#EF4135" />
    </svg>
  );
}

function FlagDe({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 3 2" className={className} aria-hidden="true">
      <rect width="3" height="0.667" y="0" fill="#000000" />
      <rect width="3" height="0.667" y="0.667" fill="#DD0000" />
      <rect width="3" height="0.667" y="1.333" fill="#FFCE00" />
    </svg>
  );
}
