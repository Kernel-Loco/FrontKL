// Next 16 renombró `middleware.ts` a `proxy.ts` (misma API).
// Es una verificación optimista: solo mira si existe la cookie de sesión.
// La autorización real la hace FastAPI en cada request.
// También pone la CSP con nonce de cada página (RC-89, src/lib/csp.ts).
import { NextResponse, type NextRequest } from "next/server";
import { NONCE_HEADER, nuevoNonce, politicaDeContenido } from "@/lib/csp";
import { SESSION_COOKIE } from "@/lib/session/shared";

const GUEST_ONLY = ["/login", "/signup"];

/** Cache-Control de toda página (RC-89). */
const CACHE_PAGINA = "private, no-cache, no-store, max-age=0, must-revalidate, no-transform";

function matches(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Solo mira si existe la cookie (httpOnly); la valida FastAPI en cada página (getServerSession).
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const redirectTo = (path: string) => NextResponse.redirect(new URL(path, request.url));

  if (pathname === "/") {
    return redirectTo(hasSession ? "/dashboard" : "/login");
  }
  if (!hasSession && matches(pathname, "/dashboard")) {
    return redirectTo("/login");
  }
  if (hasSession && GUEST_ONLY.some((base) => matches(pathname, base))) {
    return redirectTo("/dashboard");
  }

  // Next lee la CSP de la petición para poner el nonce en sus scripts; la respuesta lleva la misma.
  const nonce = nuevoNonce();
  const csp = politicaDeContenido(nonce, process.env.NODE_ENV === "development");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(NONCE_HEADER, nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  // no-transform: Cloudflare no toca la página (Email Address Obfuscation y el script de JavaScript detections no se
  // inyectan, y ese script no llevaría el nonce). El resto es el Cache-Control que Next pone a una página dinámica.
  // Costo aceptado (Ernesto, 22 nov): ni Next ni Cloudflare comprimen una respuesta con no-transform, así que el HTML
  // de las páginas va sin gzip (/login, 22 KB en vez de 5 KB). Lo de _next/static no pasa por aquí y sí va comprimido.
  // Las páginas de no encontrado se quedan sin no-transform: Next les pone su propio Cache-Control.
  response.headers.set("Cache-Control", CACHE_PAGINA);
  return response;
}

export const config = {
  matcher: [
    // Las rutas de sesión de siempre, también cuando next/link las precarga.
    "/",
    "/dashboard/:path*",
    "/login/:path*",
    "/signup",
    // Toda página, para la CSP. Fuera solo /api/v1/* (lo reenvía a FastAPI, que pone su CSP), los archivos de
    // _next/static e _next/image y las precargas de next/link, que no son documentos. El resto de /api/ y
    // /favicon.ico sí pasan: si no existen, Next responde su página de no encontrado, que también lleva scripts.
    // Las precargas del navegador (Purpose: prefetch) también pasan: lo que bajan puede acabar en pantalla.
    {
      source: "/((?!api/v1(?:/|$)|_next/static|_next/image).*)",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
  ],
};
