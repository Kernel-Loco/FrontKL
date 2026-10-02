// Next 16 renombró `middleware.ts` a `proxy.ts` (misma API).
// Es una verificación optimista: solo mira si existe la cookie de sesión.
// TODO: conectar con backend — la autorización real la hace FastAPI en cada request.
import { NextResponse, type NextRequest } from "next/server";
import { parseSession, SESSION_COOKIE } from "@/lib/session/shared";

const GUEST_ONLY = ["/login", "/signup"];

function matches(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = parseSession(request.cookies.get(SESSION_COOKIE)?.value) !== null;
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
