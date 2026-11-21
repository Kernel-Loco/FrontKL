// Asistente de IA sobre los hallazgos (#38, RC-77), desde el navegador. Solo Analista y Admin, como la API.
import { apiClient, ApiError } from "@/lib/apiClient";
import { fallaDelAsistente, TIEMPO_MAXIMO_ASISTENTE_MS } from "@/lib/asistente";
import { ServiceError } from "./errors";

/** Respuesta de `POST /api/v1/domains/{fqdn}/assistant`. La API no guarda ni la pregunta ni la respuesta. */
export interface AssistantAnswer {
  answer: string;
  finding_ids: string[];
}

/**
 * Pregunta al asistente sobre 1 a 20 hallazgos abiertos del dominio. El 404, el 429 y el 503 traen un mensaje propio
 * de la API que se muestra tal cual, en vez del genérico (ver fallaDelAsistente).
 */
export async function askAssistant(
  fqdn: string,
  question: string,
  findingIds: string[],
  signal?: AbortSignal,
): Promise<AssistantAnswer> {
  try {
    return await apiClient.post<AssistantAnswer>(
      `/domains/${encodeURIComponent(fqdn)}/assistant`,
      { question, finding_ids: findingIds },
      { signal, timeoutMs: TIEMPO_MAXIMO_ASISTENTE_MS },
    );
  } catch (error) {
    const falla = error instanceof ApiError ? fallaDelAsistente(error.status, error.detail) : null;
    if (falla && error instanceof ApiError) throw new ServiceError(falla.codigo, falla.mensaje, { status: error.status });
    throw error;
  }
}
