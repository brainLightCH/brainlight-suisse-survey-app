import { NextResponse } from "next/server";
import { sendLeadToCrm } from "@/lib/email/crm";

// Sends one clearly-fake lead to the Odoo alias so the lead's shape in the
// CRM can be checked without real data. Same secret as the email preview.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = process.env.EMAIL_PREVIEW_SECRET;
  if (!secret || url.searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!process.env.ODOO_LEADS_EMAIL?.trim()) {
    return NextResponse.json({ error: "odoo_leads_email_not_set" }, { status: 400 });
  }

  const ok = await sendLeadToCrm({
    source: "TEST — Expo — fauteuil 1 (à supprimer)",
    eventName: "TEST",
    lang: "fr",
    contact: {
      prenom: "Test",
      nom: "Lead Brainlight",
      entreprise: "Entreprise Test SA",
      email: "test.lead@example.com",
      telephone: "+41 22 000 00 00",
      adresse: "Rue du Test 1, 1200 Genève, Suisse",
    },
  });
  return NextResponse.json({ ok });
}
