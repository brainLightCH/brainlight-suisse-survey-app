import Image from "next/image";

export default function Footer() {
  return (
    <footer className="flex flex-col items-center gap-2 px-6 py-6 text-center">
      <Image
        src="/brainlight-logo.png"
        alt="brainLight Suisse"
        width={1541}
        height={516}
        className="h-6 w-auto opacity-80"
      />
      <p className="text-xs text-text-muted">
        Outil développé par brainLight Suisse
      </p>
    </footer>
  );
}
