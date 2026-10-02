// Datos del dashboard. Se llama desde Server Components.
import { mockDelay } from "@/lib/mock";
import { buildMockSummary } from "@/mocks/findings";
import type { DashboardSummary } from "@/types";

export async function getDashboardSummary(): Promise<DashboardSummary> {
  // TODO: conectar con backend → GET /dashboard/summary. Desde el servidor hay que
  // reenviar la cookie de sesión (cookies() de next/headers) para que FastAPI
  // aplique Row-Level Security por cliente.
  await mockDelay(400);
  return buildMockSummary();
}
