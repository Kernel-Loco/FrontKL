import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { checkSectionAccess } from "@/components/dashboard/SectionAccess";
import { ScoringWeightsView } from "@/components/screens/admin/ScoringWeightsView";
import { SECTIONS } from "@/config/permissions";
import { getScoringWeights } from "@/services/queries";

export const metadata: Metadata = { title: SECTIONS.pesos.label };

export default async function PesosPage() {
  const { forbidden } = await checkSectionAccess("pesos");
  if (forbidden) return forbidden;

  return (
    <div className="space-y-8">
      <PageHeader title={SECTIONS.pesos.label} description="Cómo se calcula el score de riesgo: el juego de reglas que está activo." />
      <ScoringWeightsView weights={await getScoringWeights()} />
    </div>
  );
}
