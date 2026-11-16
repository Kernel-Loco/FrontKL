import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ServiceUnavailable } from "@/components/dashboard/ServiceUnavailable";
import { getServerSession } from "@/lib/session/server";
import { getDomains } from "@/services/queries";
import { ServiceError } from "@/services/errors";
import type { Session } from "@/types";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let session: Session | null;
  try {
    session = await getServerSession();
  } catch (error) {
    // La API no respondió al validar la sesión: el menú sigue visible con el aviso y Reintentar,
    // sin pasar por /auth/expirada, que borraría una cookie que puede seguir viva (#108, RC-225).
    if (!(error instanceof ServiceError)) throw error;
    return (
      <DashboardShell user={null} badges={{}}>
        <ServiceUnavailable message={error.message} />
      </DashboardShell>
    );
  }
  if (!session) redirect("/auth/expirada");

  // Dominios que necesitan atención (por validar, vencidos o en pausa): número en el menú.
  // Si la API falla, el menú sigue visible sin el número y la página muestra su propio error.
  let attention = 0;
  try {
    const domains = await getDomains();
    attention = domains.items.filter((d) => d.status !== "removed" && !d.scan_eligibility.can_scan).length;
  } catch (error) {
    if (!(error instanceof ServiceError)) throw error;
  }

  return (
    <DashboardShell user={session.user} badges={{ dominios: attention }}>
      {children}
    </DashboardShell>
  );
}
