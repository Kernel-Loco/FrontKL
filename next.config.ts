import type { NextConfig } from "next";

/** Dónde escucha FastAPI, visto desde el servidor de Next (no desde el navegador). */
const API_INTERNAL_URL = (process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

// Ningún sitio mete el portal en un marco (protege la pantalla de login) y el navegador no adivina el tipo de
// una respuesta (RC-283). Esta CSP de un solo punto queda para lo que no pasa por src/proxy.ts (archivos de
// _next/static, favicon). Las páginas llevan además la CSP completa con nonce de proxy.ts (RC-89).
// HSTS va sin preload, igual que en la API (cirdan/api/main.py de BackKL): hstspreload.org acepta el dominio de quien
// lo inscriba y salir de la lista tarda meses. Por http (npm run dev o start en local) el navegador lo ignora.
// Permissions-Policy no apaga publickey-credentials-get: las passkeys lo usan.
// Referrer-Policy same-origin: el Referer completo solo dentro del portal y nada hacia otros sitios. Con no-referrer
// el navegador manda Origin: null en un POST de formulario normal y la API lo rechaza (same_origin_writes de
// cirdan/api/main.py). La API sigue con no-referrer: solo responde JSON.
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), usb=()" },
];

// Corte del reenvío de /api/v1/* a FastAPI. Next corta a los 30 s por omisión y responde un 500 genérico, pero el
// asistente de IA (RC-77) prueba dos proveedores de 15 s cada uno: con 40 s su 503 llega con su mensaje. Va por
// debajo de TIEMPO_MAXIMO_ASISTENTE_MS (src/lib/asistente.ts) y lo revisa asistente.test.mjs.
const PROXY_TIMEOUT_MS = 40_000;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: { proxyTimeout: PROXY_TIMEOUT_MS },
  // Solo la imagen del despliegue (Dockerfile, RC-91) compila standalone. Sin la variable, npm start sigue igual.
  ...(process.env.NEXT_OUTPUT === "standalone" && { output: "standalone" as const }),
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
