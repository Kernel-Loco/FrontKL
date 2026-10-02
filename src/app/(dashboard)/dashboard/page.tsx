import type { Metadata } from "next";
import { CalendarClock, Gauge, Server, ShieldAlert } from "lucide-react";
import { FindingsTable } from "@/components/dashboard/FindingsTable";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { formatDateTime, formatRelative, riskLevel } from "@/lib/format";
import { getDashboardSummary } from "@/services/dashboardService";

export const metadata: Metadata = { title: "Resumen" };

export default async function ResumenPage() {
  const summary = await getDashboardSummary();

  return (
    <div className="space-y-8">
      <PageHeader title="Resumen" description="Estado general de la superficie de ataque monitoreada." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Activos monitoreados" value={summary.monitored_assets} hint="Dominios, IPs y servicios expuestos" icon={Server} />
        <KpiCard
          label="Hallazgos críticos"
          value={summary.critical_findings}
          hint={`${summary.kev_findings} hallazgos en CISA KEV`}
          icon={ShieldAlert}
          tone="critical"
        />
        <KpiCard
          label="Score de riesgo promedio"
          value={summary.average_risk_score}
          suffix="/100"
          hint={`Riesgo ${riskLevel(summary.average_risk_score).toLowerCase()} · KEV, EPSS y CVSS`}
          icon={Gauge}
        />
        <KpiCard
          label="Último escaneo"
          value={formatRelative(summary.last_scan_at)}
          hint={formatDateTime(summary.last_scan_at)}
          icon={CalendarClock}
        />
      </div>

      <FindingsTable findings={summary.recent_findings} />
    </div>
  );
}
