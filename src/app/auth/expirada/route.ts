import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session/shared";

/**
 * La cookie existe pero FastAPI ya no reconoce la sesión (expiró o se cerró en otro lado).
 * Se borra aquí antes de volver al login; si no, proxy.ts mandaría de /login a /dashboard
 * y el dashboard de vuelta a /login sin fin.
 */
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login?notice=expired", request.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
