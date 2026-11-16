import { NextResponse } from "next/server";
import { loginNoticeFrom } from "@/lib/session/logout";
import { SESSION_COOKIE } from "@/lib/session/shared";

/**
 * Borra la cookie de sesión y vuelve al login. La usan dos casos:
 * - La cookie existe pero FastAPI ya no reconoce la sesión (expiró o se cerró en otro lado). Si no se borrara
 *   aquí, proxy.ts mandaría de /login a /dashboard y el dashboard de vuelta a /login sin fin. El 401 no dice si
 *   fue inactividad, el tope de 8 h o un cierre en otro lado: sin ?notice, el aviso 'ended' nombra las tres.
 * - Cerrar sesión, a mano o por IdleTimeout, con ?notice=logout, expired o max (signOutPath). Así la cookie se
 *   borra aunque la API esté caída (revisión de riesgo del 15 nov, #0 de RC-225). Otro valor cae en 'ended'.
 *
 * Location va relativo. En la imagen del despliegue (Dockerfile, HOSTNAME=0.0.0.0) request.url es
 * https://0.0.0.0:3000/..., así que una URL absoluta armada con él manda al navegador a una dirección
 * a la que no llega (#49, RC-91). El navegador resuelve el relativo contra el nombre que abrió.
 * De request.url solo se lee ?notice.
 */
export function GET(request: Request) {
  const notice = loginNoticeFrom(new URL(request.url).searchParams.get("notice"));
  const response = new NextResponse(null, { status: 307, headers: { Location: `/login?notice=${notice}` } });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
