// Salida del portal que no depende de la API (revisión de riesgo del 15 nov, #0 y #1 de RC-225).
// La cookie de sesión es httpOnly: solo una respuesta del servidor la borra. /auth/expirada la borra y lleva al
// login con el aviso que toque, así que cerrar sesión funciona aunque POST /auth/logout falle o la API esté caída.
// Antes se iba a /login con router.replace: con la cookie intacta, proxy.ts devolvía a /dashboard.
// Sin imports de valores, para que las pruebas de node lo carguen solo.

/** Avisos del login a los que lleva la salida (NOTICES de src/app/(auth)/login/page.tsx). */
export const LOGIN_NOTICES = ["ended", "logout", "expired", "max"] as const;
export type LoginNotice = (typeof LOGIN_NOTICES)[number];

/** El aviso pedido si es uno de LOGIN_NOTICES; si no, 'ended', el que daba /auth/expirada antes. */
export function loginNoticeFrom(value: string | null | undefined): LoginNotice {
  return LOGIN_NOTICES.find((notice) => notice === value) ?? "ended";
}

/** Ruta de Next que borra la cookie y lleva a /login?notice=<aviso>. */
export function signOutPath(notice: LoginNotice): string {
  return `/auth/expirada?notice=${notice}`;
}

/** Navegación completa a esa ruta: es un route handler, no una página, y el router de Next no la sigue. */
export function leaveSession(notice: LoginNotice, location: Pick<Location, "replace"> = window.location): void {
  location.replace(signOutPath(notice));
}
