import Image from "next/image";
import { translations, type Lang } from "@/lib/i18n";

export default function Footer({ lang = "fr" }: { lang?: Lang }) {
  const t = translations[lang];
  return (
    <footer className="flex flex-col items-center gap-2 px-6 py-6 text-center">
      <Image
        src="/brainlight-logo.png"
        alt="brainLight Suisse"
        width={1541}
        height={516}
        className="h-10 w-auto opacity-80"
      />
      <p className="text-xs text-text-muted">{t.footerDisclaimer}</p>
    </footer>
  );
}
