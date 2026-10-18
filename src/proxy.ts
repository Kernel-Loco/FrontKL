// Next 16 renombró `middleware.ts` a `proxy.ts` (misma API).
// Es una verificación optimista: solo mira si existe la cookie de sesión.
// La autorización real la hace FastAPI en cada request.
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session/shared";

const GUEST_ONLY = ["/login", "/signup"];

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
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/login/:path*", "/signup"],
};
