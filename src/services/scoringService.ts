// Juego de reglas activo: pesos, bandas, piso y umbral (contrato de API v1, #21).
import { mockDelay } from "@/lib/mock";
import { mockWeights } from "@/mocks/api/contrato";
import type { ScoringWeights } from "@/types";

export async function getScoringWeights(): Promise<ScoringWeights> {
  // TODO: conectar con backend → GET /scoring/weights
  await mockDelay(200);
  return structuredClone(mockWeights);
}
