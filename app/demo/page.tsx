import type { Metadata } from "next";
import { DemoPanel } from "@/components/demo/demo-panel";
import { SiteFooter } from "@/components/ability/site-chrome";
import { getMeta } from "@/lib/server-data";

export const metadata: Metadata = {
  title: "Démonstration",
  robots: { index: false },
};

export default function DemoPage() {
  return (
    <>
      <main id="contenu" className="mx-auto w-full max-w-5xl px-4 py-10">
        <p className="text-sm font-bold tracking-wide text-ink-600 uppercase">Pour l&apos;enquêteur</p>
        <h1 className="text-4xl">Démonstration</h1>
        <p className="mt-3 mb-8 max-w-3xl text-lg text-ink-700">
          Préparez la maquette avant un entretien ou une présentation : un persona, un point de départ, et une
          remise à zéro entre deux personnes.
        </p>
        <DemoPanel />
      </main>
      <SiteFooter meta={getMeta()} />
    </>
  );
}
