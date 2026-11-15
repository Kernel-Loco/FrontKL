// Funciones de src/services que todavía no llaman a la API: esperan con `mockDelay` y devuelven
// un resultado inventado, sin guardar nada (#190, RC-308).
//
// Es la única lista. Cuando una tarjeta conecte una función, bórrala de aquí: el aviso de sus
// pantallas y el prefijo «Simulado» de sus mensajes desaparecen solos, sin tocar la pantalla.
// `npm run revisar:simulado` falla si una función con `mockDelay` no está aquí o si sobra una.

type Servicios = typeof import("@/services/adminService") &
  typeof import("@/services/domainService") &
  typeof import("@/services/queries") &
  typeof import("@/services/reportService") &
  typeof import("@/services/settingsService") &
  typeof import("@/services/userService");

/** Nombre de una función exportada por los servicios. Un nombre mal escrito no compila. */
export type FuncionDeServicio = keyof Servicios;

export const FUNCIONES_SIMULADAS: readonly FuncionDeServicio[] = [
  // Usuarios (userService.ts)
  "getUsers",
  "inviteUser",
  "changeUserRole",
  // Llaves de API, webhooks y bitácora (adminService.ts)
  "getApiKeys",
  "createApiKey",
  "revokeApiKey",
  "getIntegrations",
  "createIntegration",
  "setIntegrationEnabled",
  "getAuditLog",
  // Alta de dominio y verificación TXT (domainService.ts)
  "registerDomain",
  "verifyTxt",
  // Políticas de alerta (settingsService.ts)
  "getSettings",
  "getAlertPolicies",
  "updateAlertPolicies",
  // Reportes (reportService.ts)
  "getReports",
  "requestReport",
];

/** Prefijo de toda llave o token inventado por el portal (regla 7 del equipo). */
export const PREFIJO_FALSO = "CIRDAN_FAKE_";

export const AVISO_SIMULADO = "Simulado: esto no se guarda";
export const AVISO_DATOS_DE_EJEMPLO = "Datos de ejemplo";

/** ¿Alguna de estas funciones sigue simulada? */
export function esSimulada(...funciones: FuncionDeServicio[]): boolean {
  return funciones.some((f) => FUNCIONES_SIMULADAS.includes(f));
}

/** Mensaje de éxito de una función: si sigue simulada, empieza con «Simulado». */
export function mensajeDeExito(funcion: FuncionDeServicio, texto: string): string {
  return esSimulada(funcion) ? `Simulado. ${texto}` : texto;
}
