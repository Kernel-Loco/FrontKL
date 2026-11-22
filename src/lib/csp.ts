// CSP del portal con nonce (RC-89). La arma src/proxy.ts en cada petición de página y Next pone el nonce en sus
// propios scripts al renderizar (lee la CSP de la petición). Por eso el layout raíz pide render dinámico: una página
// estática se arma sin petición y sus scripts quedarían sin nonce.
//
// - script-src: solo scripts con el nonce, y lo que ellos carguen ('strict-dynamic'). Nada de 'unsafe-inline'.
//   'unsafe-eval' solo con next dev, que lo usa para las trazas de error de React.
// - style-src 'unsafe-inline': React escribe atributos style="..." (barras, anchos) y el widget de altcha mete su
//   propio <style>. Un nonce no cubre los atributos y, si va un nonce, el navegador ignora 'unsafe-inline'.
// - img-src data: por el QR de la MFA (data:image/svg+xml que dibuja la API). blob: por las descargas.
// - worker-src blob: altcha resuelve la prueba de trabajo en un Worker que crea desde un blob.
// - connect-src 'self': el navegador solo habla con el portal, que reenvía /api/v1/* a FastAPI.
// - frame-ancestors 'none' se conserva de RC-283.

/** Encabezado con el que proxy.ts le pasa el nonce al render (por si una página lo necesita). */
export const NONCE_HEADER = "x-nonce";

/** Un nonce nuevo: 16 bytes al azar en base64. */
export function nuevoNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

/** La CSP de una página con su nonce. `desarrollo` es next dev. */
export function politicaDeContenido(nonce: string, desarrollo = false): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${desarrollo ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}
