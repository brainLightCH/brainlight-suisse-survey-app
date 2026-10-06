import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendEmail } from "./send";

export interface CrmLead {
  /** Row to stamp with crm_sent_at once sent. Omit for test sends. */
  responseId?: string;
  /** Shown as "Source" in the lead, e.g. "Expo — IFAS 2026 (fauteuil 2)". */
  source: string;
  /** Prefixes the lead title, e.g. the event name. */
  eventName: string;
  lang: string | null;
  contact: {
    prenom: string | null;
    nom: string | null;
    entreprise: string | null;
    email: string | null;
    telephone: string | null;
    adresse: string | null;
  };
  results?: {
    stressBefore: number | null;
    stressAfter: number;
    usageLikelihood: number | null;
  };
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function clean(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function renderCrmLead(lead: CrmLead): {
  subject: string;
  html: string;
  text: string;
  fullName: string;
} {
  const c = lead.contact;
  const fullName = [clean(c.prenom), clean(c.nom)].filter(Boolean).join(" ");
  const entreprise = clean(c.entreprise);
  const subject = `${clean(lead.eventName)} — ${fullName || "(sans nom)"}${
    entreprise ? ` (${entreprise})` : ""
  }`;

  const contactLines: [string, string][] = [
    ["Nom", fullName],
    ["Entreprise", entreprise],
    ["Email", clean(c.email)],
    ["Téléphone", clean(c.telephone)],
    ["Adresse", clean(c.adresse)],
    ["Langue", lead.lang === "de" ? "Allemand" : lead.lang === "fr" ? "Français" : ""],
  ].filter(([, v]) => v) as [string, string][];

  const resultLines: [string, string][] = [];
  if (lead.results) {
    const { stressBefore, stressAfter, usageLikelihood } = lead.results;
    if (stressBefore !== null) {
      const reduction =
        stressBefore > 0
          ? Math.round(((stressBefore - stressAfter) / stressBefore) * 100)
          : null;
      resultLines.push([
        "Stress perçu",
        `${stressBefore}/10 → ${stressAfter}/10${
          reduction !== null && reduction > 0 ? ` (−${reduction} %)` : ""
        }`,
      ]);
    } else {
      resultLines.push(["Stress perçu après", `${stressAfter}/10`]);
    }
    if (usageLikelihood !== null) {
      resultLines.push(["Probabilité d'utilisation", `${usageLikelihood}/10`]);
    }
  }

  const section = (title: string, lines: [string, string][]) =>
    lines.length
      ? `${title}\n${lines.map(([k, v]) => `${k} : ${v}`).join("\n")}`
      : "";

  const text = [
    `Source : ${lead.source}`,
    "",
    section("CONTACT", contactLines),
    "",
    section("RÉSULTATS", resultLines),
  ]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "")
    .join("\n")
    .trim();

  const htmlSection = (title: string, lines: [string, string][]) =>
    lines.length
      ? `<p><strong>${title}</strong><br>${lines
          .map(([k, v]) => `${esc(k)} : ${esc(v)}`)
          .join("<br>")}</p>`
      : "";

  const html = `<div><p>Source : ${esc(lead.source)}</p>${htmlSection(
    "CONTACT",
    contactLines
  )}${htmlSection("RÉSULTATS", resultLines)}</div>`;

  return { subject, html, text, fullName };
}

// Pushes one lead to Odoo CRM by emailing the CRM's catch-all alias.
// Never throws and never blocks saving: callers have already persisted
// the data. Returns true only if the email was handed to Resend.
export async function sendLeadToCrm(lead: CrmLead): Promise<boolean> {
  const to = process.env.ODOO_LEADS_EMAIL?.trim();
  if (!to) {
    console.warn("[crm] ODOO_LEADS_EMAIL not set — lead not pushed");
    return false;
  }

  const { subject, html, text, fullName } = renderCrmLead(lead);
  const email = clean(lead.contact.email);

  const result = await sendEmail({
    to,
    subject,
    html,
    text,
    replyTo: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined,
    fromName: fullName || undefined,
  });
  if (!result.ok) {
    console.error("[crm] send failed:", result.error);
    return false;
  }

  if (lead.responseId) {
    const { error } = await supabaseAdmin
      .from("responses")
      .update({ crm_sent_at: new Date().toISOString() })
      .eq("id", lead.responseId);
    if (error) console.error("[crm] crm_sent_at update failed:", error);
  }
  return true;
}
