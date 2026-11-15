import { apiClient } from "@/lib/apiClient";
import type { Category, ScoringWeightsUpdateResult } from "@/types";

export function updateScoringWeights(category_weights: Record<Category, number>) {
  return apiClient.put<ScoringWeightsUpdateResult>("/scoring/weights", { category_weights });
}
