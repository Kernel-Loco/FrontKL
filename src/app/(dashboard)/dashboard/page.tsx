import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { checkSectionAccess } from "@/components/dashboard/SectionAccess";
import { DomainsRiskTable } from "@/components/screens/dashboard/DomainsRiskTable";
import { FindingsByTypeChart } from "@/components/screens/dashboard/FindingsByTypeChart";
import { KpiTile } from "@/components/screens/dashboard/KpiTile";
import { RecentChanges, type Change } from "@/components/screens/dashboard/RecentChanges";
import { ScanButton } from "@/components/screens/shared/ScanButton";
import { scoredDomains } from "@/components/screens/shared/domainState";
import { BAND_TONE } from "@/components/ui/tones";
import { can, canAccessSection } from "@/config/permissions";
import { scoreBand } from "@/lib/format";
import { getDomainFindings, getDomains, getScans } from "@/services/queries";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { user, forbidden } = await checkSectionAccess("dashboard");
  if (forbidden) return forbidden;

  const [domains, scans] = await Promise.all([getDomains(), getScans()]);
  const visible = domains.items.filter((d) => d.status !== "removed");
  const scored = scoredDomains(visible);
  const average = scored.length ? Math.round(scored.reduce((sum, d) => sum + (d.score ?? 0), 0) / scored.length) : null;
  const critical = visible.reduce((sum, d) => sum + d.open_findings.critical, 0);
  const running = scans.items.filter((s) => s.status === "queued" || s.status === "running").length;

  // El gráfico incluye todos los dominios activos; la lista de cambios conserva el alcance por score.
  const findings = await Promise.all(visible.map((domain) => getDomainFindings(domain.fqdn)));
  const scoredFqdns = new Set(scored.map((domain) => domain.fqdn));
  const changes: Change[] = findings
    .filter((result) => scoredFqdns.has(result.domain))
    .flatMap((f) => f.items.filter((item) => item.recurrence === "new").map((finding) => ({ domain: f.domain, finding })))
    .slice(0, 5);

  // Primero los que tienen score (de mayor a menor riesgo), luego los demás.
  const rows = [...scored, ...visible.filter((d) => d.score === null)];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Riesgo de todos los dominios autorizados."
        actions={can(user.role, "request_scan") ? <ScanButton domains={visible} /> : undefined}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Dominios monitoreados" value={visible.filter((d) => d.status === "verified").length} />
        <KpiTile label="Riesgo promedio" value={average ?? "—"} tone={average !== null ? BAND_TONE[scoreBand(average)] : undefined} />
        <KpiTile label="Hallazgos críticos" value={critical} tone={critical > 0 ? "red" : undefined} />
        <KpiTile label="Escaneos en curso" value={running} />
      </div>
      <FindingsByTypeChart series={findings.map(({ domain, items }) => ({ domain, findings: items }))} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <DomainsRiskTable domains={rows} canOpenDetail={canAccessSection(user.role, "detalle")} />
        <RecentChanges changes={changes} />
      </div>
    </div>
  );
}
