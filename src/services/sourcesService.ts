import { apiClient } from "@/lib/apiClient";
import type { SourceSetting } from "@/types";

/** Apaga una fuente OSINT para la empresa o quita ese apagado (RC-235). Solo Admin. La empresa no enciende lo que la plataforma apagó. */
export function setSourceEnabled(code: string, enabled: boolean) {
  return apiClient.put<SourceSetting>(`/sources/${encodeURIComponent(code)}`, { enabled });
}
