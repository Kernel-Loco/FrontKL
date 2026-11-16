import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session/server";
import { ServiceError } from "@/services/errors";

// proxy.ts ya redirige "/"; esto es un respaldo por si cambia su matcher.
export default async function Home() {
  // Con la API caída se va al panel, que muestra el aviso con el menú (#108, RC-225).
  const session = await getServerSession().catch((error: unknown) => {
    if (error instanceof ServiceError) return "unavailable" as const;
    throw error;
  });
  redirect(session ? "/dashboard" : "/login");
}
