// A dónde manda proxy.ts según la ruta y si hay cookie de sesión. Sin imports para probarlo con node --test.

const GUEST_ONLY = ["/login", "/signup"];
// La página del enlace al correo (#28, RC-63) se abre aunque haya cookie: con una cookie vencida o de otra persona,
// mandarla a /dashboard conservaba el #t= y el token terminaba sin canjear en la barra y el historial (M1).
export const ALWAYS_OPEN = ["/login/enlace"]; // LOGIN_LINK_PATH de loginLink.ts

function matches(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/** La ruta a la que redirigir, o null para seguir. */
export function proxyRedirect(pathname: string, hasSession: boolean): string | null {
  if (pathname === "/") return hasSession ? "/dashboard" : "/login";
  if (!hasSession && matches(pathname, "/dashboard")) return "/login";
  if (ALWAYS_OPEN.some((base) => matches(pathname, base))) return null;
  if (hasSession && GUEST_ONLY.some((base) => matches(pathname, base))) return "/dashboard";
  return null;
}
