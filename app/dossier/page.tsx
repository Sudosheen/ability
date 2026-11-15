import type { Metadata } from "next";
import { Suspense } from "react";
import { Dossier } from "@/components/trip/dossier";

export const metadata: Metadata = { title: "Dossier de séjour" };

export default function DossierPage() {
  return (
    <main id="contenu" className="mx-auto w-full max-w-4xl px-4 py-10 print:max-w-none print:p-0">
      <Suspense fallback={<p role="status" className="text-ink-600">Chargement du dossier…</p>}>
        <Dossier />
      </Suspense>
    </main>
  );
}
