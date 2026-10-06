import { NextResponse } from "next/server";
import type { Lang } from "@/lib/i18n";
import { reductionPercent } from "@/lib/email/results";
import { sendEmail } from "@/lib/email/send";
import {
  renderResultsEmail,
  resolveCtaUrl,
  type MetricKey,
  type MetricResult,
} from "@/lib/email/templates";

function sampleMetric(
  key: MetricKey,
  before: number,
  after: number,
  average: number
): MetricResult {
  return { key, before, after, reduction: reductionPercent(before, after), average };
}

function sample(lang: Lang, baseUrl: string, neutral: boolean) {
  const eventName = process.env.EXPO_EVENT_NAME?.trim() || "IFAS 2026";
  return renderResultsEmail({
    lang,
    prenom: lang === "fr" ? "Marie" : "Max",
    eventName,
    metrics: [
      sampleMetric("stress", 7, neutral ? 8 : 3, 48),
      sampleMetric("fatigue_nerveuse", 6, neutral ? 6 : 3, 45),
      sampleMetric("fatigue_physique", 5, neutral ? 5 : 3, 40),
    ],
    ctaUrl: resolveCtaUrl(lang, eventName),
    logoUrl: `${baseUrl}/brainlight-logo.png`,
  });
}

// ?render=fr|de[&variant=neutral] → HTML in the browser, nothing is sent.
// ?to=addr&secret=… → sends a FR and a DE preview to that address. The
// secret keeps this from being used to mail arbitrary people.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const baseUrl = url.origin;
  const neutral = url.searchParams.get("variant") === "neutral";

  const render = url.searchParams.get("render");
  if (render === "fr" || render === "de") {
    return new Response(sample(render, baseUrl, neutral).html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const secret = process.env.EMAIL_PREVIEW_SECRET;
  if (!secret || url.searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const to = url.searchParams.get("to")?.trim() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: "invalid_to" }, { status: 400 });
  }

  const results: Record<string, unknown> = {};
  for (const lang of ["fr", "de"] as const) {
    const { subject, html, text } = sample(lang, baseUrl, neutral);
    results[lang] = await sendEmail({
      to,
      subject: `[Aperçu] ${subject}`,
      html,
      text,
    });
  }
  return NextResponse.json({ to, results });
}
