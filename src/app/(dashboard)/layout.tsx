import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getServerSession } from "@/lib/session/server";
import { getDomains } from "@/services/queries";
import { ServiceError } from "@/services/errors";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
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
