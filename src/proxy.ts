// Next 16 renombró `middleware.ts` a `proxy.ts` (misma API).
// Es una verificación optimista: solo mira si existe la cookie de sesión.
// La autorización real la hace FastAPI en cada request.
import { NextResponse, type NextRequest } from "next/server";
import { proxyRedirect } from "@/lib/proxyRedirect";
import { SESSION_COOKIE } from "@/lib/session/shared";

export function proxy(request: NextRequest) {
  // Solo mira si existe la cookie (httpOnly); la valida FastAPI en cada página (getServerSession).
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const destino = proxyRedirect(request.nextUrl.pathname, hasSession);
  return destino ? NextResponse.redirect(new URL(destino, request.url)) : NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/login/:path*", "/signup"],
};
