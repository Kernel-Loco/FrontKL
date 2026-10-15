import type { NextConfig } from "next";

/** Dónde escucha FastAPI, visto desde el servidor de Next (no desde el navegador). */
const API_INTERNAL_URL = (process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // El navegador solo habla con el portal: /api/v1/* se reenvía a FastAPI. Así la cookie de
  // sesión (httpOnly) es del mismo sitio y no hace falta abrir CORS en la API.
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${API_INTERNAL_URL}/api/v1/:path*` }];
  },
};

export default nextConfig;
