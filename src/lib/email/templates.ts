import type { Lang } from "@/lib/i18n";

export type MetricKey = "stress" | "fatigue_nerveuse" | "fatigue_physique";

export interface MetricResult {
  key: MetricKey;
  before: number;
  after: number;
  /** Participant's own reduction in %, rounded. null = not computable. */
  reduction: number | null;
  /** Average reduction in % across the event's participants. */
  average: number | null;
}

export interface ResultsEmailParams {
  lang: Lang;
  prenom: string;
  eventName: string;
  /** One entry per metric, in display order. */
  metrics: MetricResult[];
  ctaUrl: string;
  logoUrl: string;
}

const CONTACT_EMAIL = "info@brainlight-suisse.ch";
const CONTACT_TEL = "+41 22 990 00 25";

// Same green → yellow → red severity scale as the dashboard chart.
const GREEN = "#25D041";
const YELLOW = "#C2D025";
const RED = "#D02525";

const COPY = {
  fr: {
    subject: (e: string) => `Vos résultats brainLight (${e})`,
    greeting: (p: string) => `Bonjour ${p},`,
    intro: (e: string) =>
      `Merci d'avoir participé à une séance brainLight lors ${
        /^[aeiouyhàâäéèêëîïôöùûü]/i.test(e) ? "d'" : "de "
      }${e} ! Nous avons le plaisir de vous transmettre vos résultats ci-dessous.`,
    metricTitles: {
      stress: "Stress perçu",
      fatigue_nerveuse: "Fatigue nerveuse et émotionnelle",
      fatigue_physique: "Fatigue physique",
    },
    before: "Avant la séance",
    after: "Après la séance",
    reduction: "Réduction",
    average: (e: string) => `Moyenne des participants ${e}`,
    positive:
      "En quelques minutes seulement, votre corps et votre esprit ont pu ressentir les bienfaits d'une séance brainLight.",
    neutral:
      "Une première séance dans l'effervescence d'un salon est une expérience particulière. Dans un cadre calme et avec une utilisation régulière, les effets se révèlent pleinement.",
    imagine:
      "Imaginez l'impact que pourrait avoir une utilisation régulière sur le bien-être et la performance au quotidien, pour vous et vos collaborateurs.",
    advice:
      "L'équipe brainLight Suisse est à votre entière disposition pour vous conseiller sur la mise en place de systèmes brainLight au sein de votre entreprise.",
    button: "J'aimerais un entretien",
    signoff: ["Belle journée,", "L'équipe brainLight Suisse"],
    questionsTitle: "Vous avez des questions ?",
    questionsText: "Contactez-nous, nous sommes là pour vous !",
    tel: `Tél. : ${CONTACT_TEL}`,
    mail: `E-mail : ${CONTACT_EMAIL}`,
    colon: " :",
  },
  de: {
    subject: (e: string) => `Ihre brainLight-Ergebnisse (${e})`,
    greeting: (p: string) => `Guten Tag ${p},`,
    intro: (e: string) =>
      `Vielen Dank für Ihre Teilnahme an einer brainLight-Sitzung an der ${e}! Wir freuen uns, Ihnen untenstehend Ihre Ergebnisse zu übermitteln.`,
    metricTitles: {
      stress: "Stressempfinden",
      fatigue_nerveuse: "Nervliche und emotionale Erschöpfung",
      fatigue_physique: "Körperliche Erschöpfung",
    },
    before: "Vor der Sitzung",
    after: "Nach der Sitzung",
    reduction: "Reduktion",
    average: (e: string) => `Durchschnitt aller Teilnehmenden an der ${e}`,
    positive:
      "In nur wenigen Minuten konnten Sie die Vorteile einer brainLight-Sitzung für Körper und Geist spüren.",
    neutral:
      "Eine erste Sitzung im lebhaften Umfeld einer Messe ist eine besondere Erfahrung. In ruhiger Umgebung und bei regelmässiger Nutzung entfaltet sich die Wirkung voll.",
    imagine:
      "Stellen Sie sich vor, welche Wirkung eine regelmässige Nutzung auf das Wohlbefinden und die Leistungsfähigkeit im Alltag für Sie und Ihre Mitarbeitenden haben könnte.",
    advice:
      "Das brainLight Suisse Team steht Ihnen jederzeit zur Verfügung, um Ihr Projekt mit brainLight zu besprechen und zu realisieren.",
    button: "Ich wünsche ein Gespräch",
    signoff: [
      "Wir wünschen Ihnen einen schönen Tag.",
      "Freundliche Grüsse",
      "Ihr brainLight Suisse Team",
    ],
    questionsTitle: "Haben Sie Fragen?",
    questionsText:
      "Zögern Sie nicht, uns zu kontaktieren! Wir sind gerne für Sie da.",
    tel: `Tel.: ${CONTACT_TEL}`,
    mail: `E-Mail: ${CONTACT_EMAIL}`,
    colon: ":",
  },
} as const;

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const out = pa.map((c, i) => Math.round(c + (pb[i] - c) * t));
  return `#${out.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

// Solid fallback for clients that ignore CSS gradients (e.g. Outlook).
function scoreColor(score: number): string {
  const s = Math.max(0, Math.min(10, score));
  return s <= 5 ? mix(GREEN, YELLOW, s / 5) : mix(YELLOW, RED, (s - 5) / 5);
}

// The gradient spans the whole 0-10 track: the fill cell only shows the part
// up to its score, so its background is stretched to (100 / fill%) of itself.
function bar(score: number): string {
  const pct = Math.max(1, Math.min(10, score)) * 10;
  const size = (10000 / pct).toFixed(1);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;background-color:#DDE2F0;border-radius:6px;"><tr><td width="${pct}%" height="10" style="height:10px;line-height:10px;font-size:0;border-radius:6px;background-color:${scoreColor(
    score
  )};background-image:linear-gradient(90deg,${GREEN},${YELLOW},${RED});background-size:${size}% 100%;background-repeat:no-repeat;">&nbsp;</td><td height="10" style="height:10px;line-height:10px;font-size:0;">&nbsp;</td></tr></table>`;
}

export function resolveCtaUrl(lang: Lang, eventName: string): string {
  const fromEnv = process.env.RESULTS_EMAIL_CTA_URL?.trim();
  if (fromEnv) return fromEnv;
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
    COPY[lang].subject(eventName)
  )}`;
}

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export function renderResultsEmail(p: ResultsEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const c = COPY[p.lang];
  const subject = c.subject(p.eventName);
  // The closing message follows the stress result, as before.
  const stress = p.metrics.find((m) => m.key === "stress");
  const positive =
    stress !== undefined && stress.reduction !== null && stress.reduction > 0;

  const row = (label: string, value: string, extra = "", color = "#10142A") =>
    `<tr><td style="padding:10px 0;font-family:${FONT};"><div style="font-size:13px;line-height:1.4;color:#5B6286;">${esc(
      label
    )}</div><div style="font-size:22px;line-height:1.3;font-weight:700;color:${color};padding:2px 0 6px;">${esc(
      value
    )}</div>${extra}</td></tr>`;

  // Each metric gets its own heading, so the rows underneath can stay short.
  const title = (label: string, first: boolean) =>
    `<tr><td style="padding:${
      first ? "6px" : "14px"
    } 0 2px;${
      first ? "" : "border-top:1px solid #DDE2F0;"
    }font-family:${FONT};font-size:17px;line-height:1.4;font-weight:700;color:#10142A;">${esc(
      label
    )}</td></tr>`;

  const rows = p.metrics
    .map((m, i) =>
      [
        title(c.metricTitles[m.key], i === 0),
        row(c.before, `${m.before} / 10`, bar(m.before)),
        row(c.after, `${m.after} / 10`, bar(m.after)),
        m.reduction !== null && m.reduction > 0
          ? row(c.reduction, `${m.reduction} %`, "", "#1A9E3E")
          : "",
        m.average !== null && m.average > 0
          ? row(c.average(p.eventName), `${m.average} %`)
          : "",
      ].join("")
    )
    .join("");

  const p16 = `font-family:${FONT};font-size:16px;line-height:1.6;color:#1B2140;margin:0 0 16px;`;

  const html = `<!DOCTYPE html>
<html lang="${p.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#EEF0F7;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#EEF0F7;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
<tr><td align="center" style="background-color:#10142A;padding:24px;"><img src="${esc(
    p.logoUrl
  )}" width="160" alt="brainLight Suisse" style="display:block;border:0;width:160px;max-width:100%;height:auto;"></td></tr>
<tr><td style="padding:28px 28px 8px;">
<p style="${p16}">${esc(c.greeting(p.prenom))}</p>
<p style="${p16}">${esc(c.intro(p.eventName))}</p>
</td></tr>
<tr><td style="padding:0 28px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F5FB;border-radius:12px;"><tr><td style="padding:12px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
</td></tr></table>
</td></tr>
<tr><td style="padding:8px 28px 0;">
<p style="${p16}">${esc(positive ? c.positive : c.neutral)}</p>
<p style="${p16}">${esc(c.imagine)}</p>
<p style="${p16}">${esc(c.advice)}</p>
</td></tr>
<tr><td align="center" style="padding:8px 28px 24px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#10142A" style="border-radius:12px;"><a href="${esc(
    p.ctaUrl
  )}" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px;">${esc(
    c.button
  )}</a></td></tr></table>
</td></tr>
<tr><td style="padding:0 28px 24px;">
<p style="${p16}margin:0;">${c.signoff.map(esc).join("<br>")}</p>
</td></tr>
<tr><td style="background-color:#F3F5FB;padding:20px 28px;font-family:${FONT};font-size:14px;line-height:1.6;color:#5B6286;">
<strong style="color:#1B2140;">${esc(c.questionsTitle)}</strong><br>
${esc(c.questionsText)}<br>
${esc(c.tel)}<br>
${esc(c.mail)}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    c.greeting(p.prenom),
    "",
    c.intro(p.eventName),
    "",
    ...p.metrics.flatMap((m) => [
      c.metricTitles[m.key].toUpperCase(),
      `${c.before}${c.colon} ${m.before} / 10`,
      `${c.after}${c.colon} ${m.after} / 10`,
      m.reduction !== null && m.reduction > 0
        ? `${c.reduction}${c.colon} ${m.reduction} %`
        : "",
      m.average !== null && m.average > 0
        ? `${c.average(p.eventName)}${c.colon} ${m.average} %`
        : "",
      "",
    ]),
    positive ? c.positive : c.neutral,
    "",
    c.imagine,
    "",
    c.advice,
    "",
    `${c.button}: ${p.ctaUrl}`,
    "",
    ...c.signoff,
    "",
    c.questionsTitle,
    c.questionsText,
    c.tel,
    c.mail,
  ]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "")
    .join("\n");

  return { subject, html, text };
}
