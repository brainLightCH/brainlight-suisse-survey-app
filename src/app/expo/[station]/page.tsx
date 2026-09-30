"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Footer from "@/components/Footer";
import LanguageSelect from "@/components/LanguageSelect";
import Slider from "@/components/Slider";
import Button from "@/components/Button";
import { translations, type Lang } from "@/lib/i18n";
import type { Session } from "@/lib/types";

type Step =
  | "loading"
  | "language"
  | "lead_form"
  | "before_form"
  | "waiting"
  | "after_form"
  | "done"
  | "invalid";

function storedLangKey(station: number) {
  return `expo_lang_${station}`;
}

function readStoredLang(station: number): Lang | null {
  try {
    const v = window.localStorage.getItem(storedLangKey(station));
    return v === "fr" || v === "de" ? v : null;
  } catch {
    return null;
  }
}

function writeStoredLang(station: number, lang: Lang) {
  try {
    window.localStorage.setItem(storedLangKey(station), lang);
  } catch {
    // Ignore — worst case a returning visitor sees French defaults.
  }
}

export default function ExpoStationPage() {
  const params = useParams<{ station: string }>();
  const stationNum = Number(params.station);
  const stationValid =
    Number.isInteger(stationNum) && stationNum >= 1 && stationNum <= 4;

  const [lang, setLang] = useState<Lang | null>(null);
  const [step, setStep] = useState<Step>(stationValid ? "loading" : "invalid");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [entreprise, setEntreprise] = useState("");
  const [adresse, setAdresse] = useState("");
  const [consent, setConsent] = useState(false);

  const [stressBefore, setStressBefore] = useState(5);
  const [fatigueNerveuseBefore, setFatigueNerveuseBefore] = useState(5);
  const [fatiguePhysiqueBefore, setFatiguePhysiqueBefore] = useState(5);

  const [stressAfter, setStressAfter] = useState(5);
  const [fatigueNerveuseAfter, setFatigueNerveuseAfter] = useState(5);
  const [fatiguePhysiqueAfter, setFatiguePhysiqueAfter] = useState(5);

  useEffect(() => {
    if (!stationValid) return;
    (async () => {
      try {
        const res = await fetch(`/api/expo/${stationNum}/active`, {
          cache: "no-store",
        });
        const json = await res.json();
        const active: Session | null = json.session;
        if (!active) {
          setStep("language");
          return;
        }
        setLang(readStoredLang(stationNum) ?? "fr");
        setStep(active.phase === "before" ? "waiting" : "after_form");
      } catch {
        setStep("language");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationNum, stationValid]);

  const handleSelectLang = useCallback(
    (l: Lang) => {
      writeStoredLang(stationNum, l);
      setLang(l);
      setStep("lead_form");
    },
    [stationNum]
  );

  async function handleSubmitBefore() {
    if (!lang) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/expo/${stationNum}/before`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lang,
          prenom,
          nom,
          email,
          telephone,
          entreprise,
          adresse,
          consent,
          stress: stressBefore,
          fatigue_nerveuse: fatigueNerveuseBefore,
          fatigue_physique: fatiguePhysiqueBefore,
        }),
      });
      if (res.status === 409) {
        setError(translations[lang].errorGeneric);
        return;
      }
      if (!res.ok) throw new Error("submit_failed");
      setStep("waiting");
    } catch {
      setError(translations[lang].errorGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFinishSession() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/expo/${stationNum}/start-after`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("start_after_failed");
      setStep("after_form");
    } catch {
      setError(lang ? translations[lang].errorGeneric : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitAfter() {
    if (!lang) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/expo/${stationNum}/after`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lang,
          stress: stressAfter,
          fatigue_nerveuse: fatigueNerveuseAfter,
          fatigue_physique: fatiguePhysiqueAfter,
        }),
      });
      if (!res.ok) throw new Error("submit_failed");
      setStep("done");
    } catch {
      setError(translations[lang].errorGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetConfirmed() {
    setShowResetConfirm(false);
    try {
      await fetch(`/api/expo/${stationNum}/reset`, { method: "POST" });
    } catch {
      // best-effort — the station may still be stuck server-side, but the
      // client resets regardless so staff can retry.
    }
    setLang(null);
    setPrenom("");
    setNom("");
    setEmail("");
    setTelephone("");
    setEntreprise("");
    setAdresse("");
    setConsent(false);
    setStressBefore(5);
    setFatigueNerveuseBefore(5);
    setFatiguePhysiqueBefore(5);
    setStressAfter(5);
    setFatigueNerveuseAfter(5);
    setFatiguePhysiqueAfter(5);
    setError(null);
    setStep("language");
  }

  const t = translations[lang ?? "fr"];
  let content: React.ReactNode = null;

  if (step === "invalid") {
    content = <p className="text-lg text-center">Fauteuil invalide.</p>;
  } else if (step === "loading") {
    content = <p className="text-text-muted">Chargement…</p>;
  } else if (step === "language") {
    content = <LanguageSelect onSelect={handleSelectLang} />;
  } else if (step === "lead_form") {
    const canContinue = Boolean(
      prenom.trim() &&
        nom.trim() &&
        email.trim() &&
        telephone.trim() &&
        adresse.trim() &&
        consent
    );

    content = (
      <div className="w-full max-w-md flex flex-col gap-6">
        <p className="text-text-muted text-sm text-center">{t.expoIntro}</p>
        <div className="flex flex-col gap-3">
          <input
            placeholder={t.firstName}
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            className="rounded-xl bg-panel-raised px-4 py-3 text-text placeholder:text-text-muted outline-none focus:ring-2 focus:ring-accent-light"
          />
          <input
            placeholder={t.lastName}
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="rounded-xl bg-panel-raised px-4 py-3 text-text placeholder:text-text-muted outline-none focus:ring-2 focus:ring-accent-light"
          />
          <input
            placeholder={t.email}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl bg-panel-raised px-4 py-3 text-text placeholder:text-text-muted outline-none focus:ring-2 focus:ring-accent-light"
          />
          <input
            placeholder={t.phone}
            type="tel"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            className="rounded-xl bg-panel-raised px-4 py-3 text-text placeholder:text-text-muted outline-none focus:ring-2 focus:ring-accent-light"
          />
          <input
            placeholder={t.company}
            value={entreprise}
            onChange={(e) => setEntreprise(e.target.value)}
            className="rounded-xl bg-panel-raised px-4 py-3 text-text placeholder:text-text-muted outline-none focus:ring-2 focus:ring-accent-light"
          />
          <textarea
            placeholder={t.address}
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
            rows={3}
            className="rounded-xl bg-panel-raised px-4 py-3 text-text placeholder:text-text-muted outline-none focus:ring-2 focus:ring-accent-light resize-none"
          />
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 w-5 h-5 accent-[#8fd9ff]"
          />
          <span className="text-sm text-text-muted">{t.expoConsent}</span>
        </label>
        <Button onClick={() => setStep("before_form")} disabled={!canContinue}>
          {t.next}
        </Button>
      </div>
    );
  } else if (step === "before_form") {
    content = (
      <>
        <h1 className="text-2xl font-semibold mb-2 text-center max-w-md">
          {t.beforeTitle}
        </h1>
        <p className="text-text-muted text-sm mb-6 text-center">
          {t.scaleHint}
        </p>
        <div className="w-full max-w-md flex flex-col gap-8">
          <div className="flex flex-col gap-6 bg-panel rounded-2xl p-5">
            <Slider
              label={t.stress}
              value={stressBefore}
              onChange={setStressBefore}
              lowLabel={t.scaleLow}
              highLabel={t.scaleHigh}
            />
            <Slider
              label={t.fatigueNerveuse}
              value={fatigueNerveuseBefore}
              onChange={setFatigueNerveuseBefore}
              lowLabel={t.scaleLow}
              highLabel={t.scaleHigh}
            />
            <Slider
              label={t.fatiguePhysique}
              value={fatiguePhysiqueBefore}
              onChange={setFatiguePhysiqueBefore}
              lowLabel={t.scaleLow}
              highLabel={t.scaleHigh}
            />
          </div>
          {error && <p className="text-danger text-sm">{error}</p>}
          <Button onClick={handleSubmitBefore} disabled={submitting}>
            {submitting ? t.submitting : t.submit}
          </Button>
        </div>
      </>
    );
  } else if (step === "waiting") {
    content = (
      <>
        <p className="text-2xl mb-2">✓</p>
        <p className="text-lg text-center mb-2">{t.expoWaitingTitle}</p>
        <p className="text-text-muted text-sm text-center mb-8 max-w-sm">
          {t.expoWaitingMessage}
        </p>
        <div className="w-full max-w-xs">
          {error && (
            <p className="text-danger text-sm text-center mb-3">{error}</p>
          )}
          <Button onClick={handleFinishSession} disabled={submitting}>
            {t.expoFinishButton}
          </Button>
        </div>
      </>
    );
  } else if (step === "after_form") {
    content = (
      <>
        <h1 className="text-2xl font-semibold mb-2 text-center max-w-md">
          {t.expoAfterTitle}
        </h1>
        <p className="text-text-muted text-sm mb-6 text-center">
          {t.scaleHint}
        </p>
        <div className="w-full max-w-md flex flex-col gap-8">
          <div className="flex flex-col gap-6 bg-panel rounded-2xl p-5">
            <Slider
              label={t.stress}
              value={stressAfter}
              onChange={setStressAfter}
              lowLabel={t.scaleLow}
              highLabel={t.scaleHigh}
            />
            <Slider
              label={t.fatigueNerveuse}
              value={fatigueNerveuseAfter}
              onChange={setFatigueNerveuseAfter}
              lowLabel={t.scaleLow}
              highLabel={t.scaleHigh}
            />
            <Slider
              label={t.fatiguePhysique}
              value={fatiguePhysiqueAfter}
              onChange={setFatiguePhysiqueAfter}
              lowLabel={t.scaleLow}
              highLabel={t.scaleHigh}
            />
          </div>
          {error && <p className="text-danger text-sm">{error}</p>}
          <Button onClick={handleSubmitAfter} disabled={submitting}>
            {submitting ? t.submitting : t.submit}
          </Button>
        </div>
      </>
    );
  } else if (step === "done") {
    content = (
      <>
        <p className="text-2xl mb-2">✓</p>
        <p className="text-lg text-center">{t.expoThankYouFinal}</p>
      </>
    );
  }

  return (
    <ExpoShell
      lang={lang}
      showResetConfirm={showResetConfirm}
      onRequestReset={() => setShowResetConfirm(true)}
      onCancelReset={() => setShowResetConfirm(false)}
      onConfirmReset={handleResetConfirmed}
    >
      {content}
    </ExpoShell>
  );
}

function ExpoShell({
  children,
  lang,
  showResetConfirm,
  onRequestReset,
  onCancelReset,
  onConfirmReset,
}: {
  children: React.ReactNode;
  lang: Lang | null;
  showResetConfirm: boolean;
  onRequestReset: () => void;
  onCancelReset: () => void;
  onConfirmReset: () => void;
}) {
  const t = translations[lang ?? "fr"];
  return (
    <>
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {children}
      </main>
      <div className="text-center pb-1">
        <button
          onClick={onRequestReset}
          className="text-[10px] text-text-muted/40 hover:text-text-muted underline"
        >
          {t.resetLink}
        </button>
      </div>
      <Footer lang={lang ?? undefined} />
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-6 z-50">
          <div className="bg-panel rounded-2xl p-6 max-w-sm w-full flex flex-col gap-4">
            <p className="text-sm text-text text-center">{t.resetConfirm}</p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={onCancelReset}>
                {t.resetConfirmCancel}
              </Button>
              <Button variant="danger" onClick={onConfirmReset}>
                {t.resetConfirmYes}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
