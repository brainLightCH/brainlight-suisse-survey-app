import Link from "next/link";

export default function CoachHomePage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-6">
      <h1 className="text-2xl font-semibold mb-2">brainLight — Coach</h1>
      <div className="w-full max-w-sm flex flex-col gap-4">
        <Link
          href="/coach/stats"
          className="w-full rounded-2xl px-6 py-6 text-center text-lg font-semibold bg-panel-raised text-text hover:brightness-110 transition"
        >
          Consulter mes données
        </Link>
        <Link
          href="/coach/session"
          className="w-full rounded-2xl px-6 py-6 text-center text-lg font-semibold bg-accent-light text-[#10142a] hover:brightness-95 transition"
        >
          Créer une séance
        </Link>
      </div>
    </main>
  );
}
