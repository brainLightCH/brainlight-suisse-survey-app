import Link from "next/link";
import Footer from "@/components/Footer";
import { EXPO_STATIONS } from "@/lib/constants";

export default function ExpoIndexPage() {
  return (
    <>
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <h1 className="text-xl font-semibold mb-6 text-center">
          brainLight — Expo
        </h1>
        <p className="text-text-muted text-sm mb-6 text-center max-w-sm">
          Chaque fauteuil a son propre lien / QR code. Les participants
          n&apos;utilisent jamais cette page — elle sert uniquement de repère.
        </p>
        <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
          {EXPO_STATIONS.map((n) => (
            <Link
              key={n}
              href={`/expo/${n}`}
              className="rounded-2xl bg-panel-raised px-4 py-6 text-center font-mono text-2xl hover:brightness-110 transition"
            >
              {n}
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
