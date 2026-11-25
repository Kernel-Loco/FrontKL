// Qué hace /auth/expirada con la cookie de sesión (RC-301). Solo imports de tipos, para que
// src/lib/session/expirada.test.mjs lo cargue directo con Node.
//
// Antes la ruta borraba la cookie siempre. Era un GET sin revisar nada: un enlace desde otro sitio sacaba al usuario
// (la cookie es SameSite=Lax, así que viaja en una navegación desde otro sitio) y su sesión seguía viva en Valkey.
import type { SessionCheck } from "./check";
import type { LoginNotice } from "./logout";

/** Avisos que pide el propio portal al cerrar sesión, a mano (Sidebar.tsx) o por inactividad (IdleTimeout.tsx). */
const AVISOS_DE_SALIDA: readonly string[] = ["logout", "expired", "max"];

export type ExpiradaInput = {
  /** ?notice tal como llegó (null si no viene). */
  requested: string | null;
  /** El aviso del login que toca (loginNoticeFrom de logout.ts sobre `requested`). */
  notice: LoginNotice;
  /** Encabezado Sec-Fetch-Site del navegador (null si no lo manda). */
  fetchSite: string | null;
  /** Si la petición trae la cookie de sesión. */
  hasCookie: boolean;
  /** GET /auth/me con la cookie. Solo se llama si hace falta. */
  check: () => Promise<SessionCheck>;
};

export type ExpiradaOutcome = { clearCookie: boolean; location: string };

/**
 * - Sin cookie: nada que borrar, va al login. No manda Set-Cookie: con la cookie guardada pero no enviada (una
 *   petición desde otro sitio que no es navegación, como una imagen), borrarla sería sacar al usuario igual.
 * - Salida pedida por el portal (?notice=logout, expired o max) desde una página del mismo origen
 *   (Sec-Fetch-Site: same-origin): borra sin llamar a la API, así cerrar sesión funciona con la API caída (RC-225).
 *   Otro sitio no puede mandar ese encabezado. Un navegador que no lo manda cae en el caso siguiente.
 * - Lo demás: pregunta a GET /auth/me. Solo un 401 borra (isSessionRejected de check.ts). Con la sesión válida o la
 *   API sin responder (5xx, 429, 403, tope de tiempo, sin red) no borra y va a /dashboard: con la sesión viva entra,
 *   y con la API caída el layout muestra el aviso de servicio caído (RC-225), que no vuelve a /auth/expirada.
 */
export async function decideExpirada(input: ExpiradaInput): Promise<ExpiradaOutcome> {
  const toLogin = `/login?notice=${input.notice}`;
  if (!input.hasCookie) return { clearCookie: false, location: toLogin };
  const pedidaPorElPortal = input.requested !== null && AVISOS_DE_SALIDA.includes(input.requested);
  if (pedidaPorElPortal && input.fetchSite === "same-origin") return { clearCookie: true, location: toLogin };
  const result = await input.check();
  if (result.kind === "rejected") return { clearCookie: true, location: toLogin };
  return { clearCookie: false, location: "/dashboard" };
}
