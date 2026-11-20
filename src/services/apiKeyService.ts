import { apiClient } from "@/lib/apiClient";
import type { ApiKeyCreated, ApiKeyRequest } from "@/types";

export const API_KEY_MAX_DAYS = 90;
export const API_KEY_OWN_USE_ERROR = "Confirma que la llave es solo para los sistemas de tu propia empresa.";

export const createApiKey = (request: ApiKeyRequest) => apiClient.post<ApiKeyCreated>("/api-keys", request);

export const revokeApiKey = (id: string) => apiClient.delete<void>(`/api-keys/${encodeURIComponent(id)}`);
