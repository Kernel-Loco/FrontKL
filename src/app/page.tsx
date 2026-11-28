import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Landing } from "@/components/landing/Landing";
import { getServerSession } from "@/lib/session/server";
import { ServiceError } from "@/services/errors";

export const metadata: Metadata = {
  title: { absolute: "LowTide · Inteligencia de la superficie de ataque externa" },
  description: "Descubre lo que tu organización deja expuesto en internet antes que un atacante, con un score de riesgo y un plan para corregirlo.",
};

// Sin sesión, la página de inicio del producto (RC-379); con sesión, el panel. proxy.ts ya manda al panel a quien trae
// la cookie: esto es un respaldo por si cambia su matcher.
export default async function Home() {
  // Con la API caída se va al panel, que muestra el aviso con el menú (#108, RC-225).
  const session = await getServerSession().catch((error: unknown) => {
    if (error instanceof ServiceError) return "unavailable" as const;
    throw error;
  });
  if (session) redirect("/dashboard");
  return <Landing />;
}
