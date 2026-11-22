// Enlace para entrar por correo (#28, RC-63). La API arma el enlace como PORTAL_URL/login/enlace#t=<token>: el token
// va después de #, así que el navegador no lo manda al servidor del portal ni a Cloudflare ni queda en sus logs. La
// página lo lee de aquí y solo lo canjea con un POST al pulsar el botón, para que el revisor de enlaces del correo del
// Tec no gaste el token al abrirlo.

export const LOGIN_LINK_PATH = "/login/enlace";

/** 32 bytes en base64 url-safe dan 43 caracteres; la API acepta de 20 a 100. */
const TOKEN = /^[A-Za-z0-9_-]{20,100}$/;

/** El token del fragmento (`#t=...`) o null si falta o no tiene la forma de un token. */
export function tokenFromHash(hash: string | null | undefined): string | null {
  if (!hash) return null;
  const token = new URLSearchParams(hash.replace(/^#/, "")).get("t");
  return token && TOKEN.test(token) ? token : null;
}
