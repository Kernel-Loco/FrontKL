import { apiClient } from "@/lib/apiClient";
import type { BandCutoffs, Category, ScoringWeightsUpdateResult } from "@/types";

/** Crea una versión nueva del juego de reglas. Sin `band_cutoffs`, la API copia los de la versión anterior (RC-237). */
export function updateScoringWeights(category_weights: Record<Category, number>, band_cutoffs?: BandCutoffs) {
  return apiClient.put<ScoringWeightsUpdateResult>("/scoring/weights", band_cutoffs ? { category_weights, band_cutoffs } : { category_weights });
}
