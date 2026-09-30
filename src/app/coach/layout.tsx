import Footer from "@/components/Footer";

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Footer lang="fr" />
    </>
  );
}
