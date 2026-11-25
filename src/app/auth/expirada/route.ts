import { NextResponse, type NextRequest } from "next/server";
import { decideExpirada } from "@/lib/session/expirada";
import { loginNoticeFrom } from "@/lib/session/logout";
import { checkSessionToken } from "@/lib/session/server";
import { SESSION_COOKIE } from "@/lib/session/shared";

/**
 * Salida al login que borra la cookie de sesión solo si la sesión ya terminó o si la pide el propio portal (RC-301,
 * reglas en decideExpirada de src/lib/session/expirada.ts). La usan dos casos:
 * - La cookie existe pero FastAPI ya no reconoce la sesión (expiró o se cerró en otro lado). Si no se borrara
 *   aquí, proxy.ts mandaría de /login a /dashboard y el dashboard de vuelta a /login sin fin. Aquí se vuelve a
 *   preguntar a GET /auth/me y solo un 401 borra. El 401 no dice si fue inactividad, el tope de 8 h o un cierre en
 *   otro lado: sin ?notice, el aviso 'ended' nombra las tres.
 * - Cerrar sesión, a mano o por IdleTimeout, con ?notice=logout, expired o max (signOutPath) desde el mismo origen.
 *   Así la cookie se borra aunque la API esté caída (revisión de riesgo del 15 nov, #0 de RC-225).
 * Un enlace desde otro sitio con la sesión viva no borra nada y lleva a /dashboard.
 *
 * Location va relativo. En la imagen del despliegue (Dockerfile, HOSTNAME=0.0.0.0) request.url es
 * https://0.0.0.0:3000/..., así que una URL absoluta armada con él manda al navegador a una dirección
 * a la que no llega (#49, RC-91). El navegador resuelve el relativo contra el nombre que abrió.
 * De request.url solo se lee ?notice.
 */
export async function GET(request: NextRequest) {
  const requested = new URL(request.url).searchParams.get("notice");
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const { clearCookie, location } = await decideExpirada({
    requested,
    notice: loginNoticeFrom(requested),
    fetchSite: request.headers.get("sec-fetch-site"),
    hasCookie: Boolean(token),
    check: () => checkSessionToken(token ?? ""),
  });
  const response = new NextResponse(null, { status: 307, headers: { Location: location } });
  if (clearCookie) response.cookies.delete(SESSION_COOKIE);
  return response;
}
