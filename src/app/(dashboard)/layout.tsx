import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getServerSession } from "@/lib/session/server";
import { getDomains } from "@/services/domainService";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  // Dominios que necesitan atención (por validar, vencidos o en pausa): número en el menú.
  const domains = await getDomains();
  const attention = domains.items.filter((d) => d.status !== "removed" && !d.scan_eligibility.can_scan).length;

  return (
    <DashboardShell user={session.user} badges={{ dominios: attention }}>
      {children}
    </DashboardShell>
  );
}
