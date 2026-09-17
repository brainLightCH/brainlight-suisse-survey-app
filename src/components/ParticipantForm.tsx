"use client";

import { useState } from "react";
import Slider from "./Slider";
import Button from "./Button";
import type { Phase } from "@/lib/types";

interface ParticipantFormProps {
  sessionId: string;
  phase: Phase;
  participantNumber: number;
  onSubmitted: () => void;
}

export default function ParticipantForm({
  sessionId,
  phase,
  participantNumber,
  onSubmitted,
}: ParticipantFormProps) {
  const [stress, setStress] = useState(5);
  const [fatigueNerveuse, setFatigueNerveuse] = useState(5);
  const [fatiguePhysique, setFatiguePhysique] = useState(5);
  const [leadOptin, setLeadOptin] = useState(false);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [entreprise, setEntreprise] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          phase,
          participant_number: participantNumber,
          stress,
          fatigue_nerveuse: fatigueNerveuse,
          fatigue_physique: fatiguePhysique,
          lead_optin: phase === "after" ? leadOptin : false,
          ...(phase === "after" && leadOptin
            ? { prenom, nom, email, telephone, entreprise }
            : {}),
        }),
      });
      if (res.status === 409) {
        setError("Le questionnaire a changé. Merci de recommencer.");
        return;
      }
      if (!res.ok) throw new Error("submit_failed");
      onSubmitted();
    } catch {
      setError("Une erreur est survenue. Merci de réessayer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        <Slider label="Stress" value={stress} onChange={setStress} />
        <Slider
          label="Fatigue nerveuse"
          value={fatigueNerveuse}
          onChange={setFatigueNerveuse}
        />
        <Slider
          label="Fatigue physique"
          value={fatiguePhysique}
          onChange={setFatiguePhysique}
        />
      </div>

      {phase === "after" && (
        <div className="flex flex-col gap-4 bg-panel rounded-2xl p-5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={leadOptin}
              onChange={(e) => setLeadOptin(e.target.checked)}
              className="mt-1 w-5 h-5 accent-[#8fd9ff]"
            />
            <span className="text-sm text-text-muted">
              Je souhaite être recontacté·e par brainLight Suisse et
              j&apos;accepte que mes coordonnées soient utilisées à cette
              fin uniquement.
            </span>
          </label>

          {leadOptin && (
            <div className="flex flex-col gap-3">
              <input
                placeholder="Prénom"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                className="rounded-xl bg-panel-raised px-4 py-3 text-text placeholder:text-text-muted outline-none focus:ring-2 focus:ring-accent-light"
              />
              <input
                placeholder="Nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="rounded-xl bg-panel-raised px-4 py-3 text-text placeholder:text-text-muted outline-none focus:ring-2 focus:ring-accent-light"
              />
              <input
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl bg-panel-raised px-4 py-3 text-text placeholder:text-text-muted outline-none focus:ring-2 focus:ring-accent-light"
              />
              <input
                placeholder="Téléphone"
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                className="rounded-xl bg-panel-raised px-4 py-3 text-text placeholder:text-text-muted outline-none focus:ring-2 focus:ring-accent-light"
              />
              <input
                placeholder="Entreprise (optionnel)"
                value={entreprise}
                onChange={(e) => setEntreprise(e.target.value)}
                className="rounded-xl bg-panel-raised px-4 py-3 text-text placeholder:text-text-muted outline-none focus:ring-2 focus:ring-accent-light"
              />
            </div>
          )}
        </div>
      )}

      {error && <p className="text-danger text-sm">{error}</p>}

      <Button onClick={handleSubmit} disabled={submitting}>
        {submitting ? "Envoi…" : "Valider"}
      </Button>
    </div>
  );
}
