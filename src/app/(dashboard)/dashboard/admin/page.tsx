import type { Metadata } from "next";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { checkSectionAccess } from "@/components/dashboard/SectionAccess";
import { AuditTable } from "@/components/screens/admin/AuditTable";
import { KpiTile } from "@/components/screens/dashboard/KpiTile";
import { domainState } from "@/components/screens/shared/domainState";
import { TEXT_LINK } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ROLE_LABELS, SECTIONS } from "@/config/permissions";
import { ROLES } from "@/types";
import { getApiKeys, getAuditLog, getIntegrations } from "@/services/adminService";
import { getDomains } from "@/services/queries";
import { getUsers } from "@/services/userService";

export const metadata: Metadata = { title: "Administración" };

export default async function AdminOverviewPage() {
  const { forbidden } = await checkSectionAccess("admin");
  if (forbidden) return forbidden;

  const [users, domains, keys, integrations, audit] = await Promise.all([getUsers(), getDomains(), getApiKeys(), getIntegrations(), getAuditLog()]);
  const now = new Date().toISOString();
  const activeKeys = keys.items.filter((k) => !k.revoked_at && k.expires_at > now).length;
  const attention = domains.items.filter((d) => d.status !== "removed" && !d.scan_eligibility.can_scan);

  return (
    <div className="space-y-8">
      <PageHeader title="Administración" description="Estado de la organización: usuarios, dominios, accesos e integraciones." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Usuarios activos" value={users.items.filter((u) => u.is_active).length} hint={`${users.total} en total`} />
        <KpiTile label="Dominios" value={domains.items.filter((d) => d.status !== "removed").length} hint={`${attention.length} requieren atención`} />
        <KpiTile label="Llaves de API activas" value={activeKeys} />
        <KpiTile label="Integraciones activas" value={integrations.items.filter((i) => i.enabled).length} hint={`${integrations.total} configuradas`} />
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <div className="space-y-6">
          <Card title="Requieren atención" icon={<TriangleAlert aria-hidden="true" className="h-4 w-4" />} action={<Link href={SECTIONS.dominios.href} className={TEXT_LINK}>Ver dominios</Link>}>
            {attention.length === 0 ? (
              <p className="text-sm text-lt-muted">Todos los dominios están autorizados y verificados.</p>
            ) : (
              <ul className="-my-2 divide-y divide-lt-border">
                {attention.map((d) => {
                  const state = domainState(d);
                  return (
                    <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="font-mono text-[13px] text-lt-text">{d.fqdn}</span>
                      <Badge tone={state.tone} dot>
                        {state.label}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
          <Card title="Usuarios por rol" action={<Link href={SECTIONS.usuarios.href} className={TEXT_LINK}>Gestionar</Link>}>
            <ul className="space-y-2.5">
              {ROLES.map((role) => (
                <li key={role} className="flex items-center justify-between text-sm">
                  <span className="text-lt-text">{ROLE_LABELS[role]}</span>
                  <span className="tabular-nums text-lt-muted">{users.items.filter((u) => u.role === role).length}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <Card title="Actividad reciente" padded={false} action={<Link href={SECTIONS.bitacora.href} className={TEXT_LINK}>Ver bitácora</Link>}>
          <AuditTable entries={audit.items.slice(0, 5)} />
        </Card>
      </div>
    </div>
  );
}
