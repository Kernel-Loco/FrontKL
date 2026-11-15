import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session/shared";

/**
 * La cookie existe pero FastAPI ya no reconoce la sesión (expiró o se cerró en otro lado).
 * Se borra aquí antes de volver al login; si no, proxy.ts mandaría de /login a /dashboard
 * y el dashboard de vuelta a /login sin fin.
 * El 401 no dice si fue inactividad, el tope de 8 h o un cierre en otro lado: el aviso nombra las tres.
 *
 * Location va relativo. En la imagen del despliegue (Dockerfile, HOSTNAME=0.0.0.0) request.url es
 * https://0.0.0.0:3000/..., así que una URL absoluta armada con él manda al navegador a una dirección
 * a la que no llega (#49, RC-91). El navegador resuelve el relativo contra el nombre que abrió.
 */
export function GET() {
  const response = new NextResponse(null, { status: 307, headers: { Location: "/login?notice=ended" } });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
