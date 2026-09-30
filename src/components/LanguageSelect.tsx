"use client";

import type { Lang } from "@/lib/i18n";

export default function LanguageSelect({
  onSelect,
}: {
  onSelect: (lang: Lang) => void;
}) {
  return (
    <>
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
    </>
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
