import type { NextConfig } from "next";

/** Dónde escucha FastAPI, visto desde el servidor de Next (no desde el navegador). */
const API_INTERNAL_URL = (process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

// Ningún sitio mete el portal en un marco (protege la pantalla de login) y el navegador no adivina el tipo de
// una respuesta (RC-283). La CSP completa con nonce y HSTS son de RC-89: si manda otra CSP, el navegador aplica
// las dos y esta se queda.
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // En todas las páginas y archivos del portal. Lo que se reenvía a FastAPI (/api/v1/*) no pasa por aquí: Next
  // entrega esa respuesta tal cual, y esas tres cabeceras las pone la propia API (cirdan/api/main.py de BackKL).
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // El navegador solo habla con el portal: /api/v1/* se reenvía a FastAPI. Así la cookie de
  // sesión (httpOnly) es del mismo sitio y no hace falta abrir CORS en la API.
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${API_INTERNAL_URL}/api/v1/:path*` }];
  },
};

export default nextConfig;
