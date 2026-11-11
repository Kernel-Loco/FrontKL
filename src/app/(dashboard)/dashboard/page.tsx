import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { checkSectionAccess } from "@/components/dashboard/SectionAccess";
import { DomainsRiskTable } from "@/components/screens/dashboard/DomainsRiskTable";
import { FindingsByTypeChart } from "@/components/screens/dashboard/FindingsByTypeChart";
import { KpiTile } from "@/components/screens/dashboard/KpiTile";
import { RecentChanges, type Change, type ScanSummary } from "@/components/screens/dashboard/RecentChanges";
import { ScanButton } from "@/components/screens/shared/ScanButton";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { domainState, scoredDomains } from "@/components/screens/shared/domainState";
import { BAND_TONE } from "@/components/ui/tones";
import { can, canAccessSection } from "@/config/permissions";
import { scoreBand } from "@/lib/format";
import { getDomainFindings, getDomainScore, getDomains, getScans } from "@/services/queries";
import type { Scan } from "@/types";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { user, forbidden } = await checkSectionAccess("dashboard");
  if (forbidden) return forbidden;

  const [domains, scans] = await Promise.all([getDomains(), getScans()]);
  const visible = domains.items.filter((d) => d.status !== "removed");
  const scored = scoredDomains(visible);
  const average = scored.length ? Math.round(scored.reduce((sum, d) => sum + (d.score ?? 0), 0) / scored.length) : null;
  const running = scans.items.filter((s) => s.status === "queued" || s.status === "running").length;

  // El gráfico incluye todos los dominios activos; el panel de cambios, los que tienen score o un escaneo terminado.
  const [findings, coverage] = await Promise.all([
    Promise.all(visible.map((domain) => getDomainFindings(domain.fqdn))),
    Promise.all(visible.map(async (domain) => {
      if (domain.score === null) return "unscanned" as const;
      return (await getDomainScore(domain.fqdn)).partial_coverage ? "partial" as const : "complete" as const;
    })),
  ]);
  const partialDomains = visible.filter((_, index) => coverage[index] === "partial").map((domain) => domain.fqdn);
  // Cuenta los críticos abiertos registrados con cualquier cobertura (hoy todo escaneo queda parcial); el hint lo avisa.
  const critical = visible.reduce((sum, domain) => sum + domain.open_findings.critical, 0);
  // Último escaneo terminado de cada dominio, también si falló: /scans viene del más nuevo al más viejo (los últimos 50 de la empresa).
  const lastScans = new Map<string, Scan>();
  for (const scan of scans.items) {
    if (scan.finished_at && !lastScans.has(scan.domain)) lastScans.set(scan.domain, scan);
  }
  // Los dominios con score y los que no tienen score pero sí un escaneo terminado (un primer escaneo que se cayó).
  const summaries: ScanSummary[] = [...scored, ...visible.filter((d) => d.score === null)].flatMap((domain): ScanSummary[] => {
    const scan = lastScans.get(domain.fqdn);
    if (scan?.finished_at) {
      // Un escaneo fallido guarda 0 y 0 aunque no revisó nada: sin conteos.
      const failed = scan.status === "failed";
      return [{
        domain: domain.fqdn,
        finishedAt: scan.finished_at,
        status: scan.status,
        newFindings: failed ? null : scan.stats?.new_findings ?? null,
        resolvedFindings: failed ? null : scan.stats?.resolved_findings ?? null,
      }];
    }
    if (domain.score === null) return [];
    // Con score pero fuera de esos 50: queda la fecha del dominio, si la hay, sin conteos.
    return [{ domain: domain.fqdn, finishedAt: domain.last_scan_at, status: null, newFindings: null, resolvedFindings: null }];
  });
  // Los resueltos no se listan: /findings solo trae abiertos.
  const summaryFqdns = new Set(summaries.map((s) => s.domain));
  const newFindings: Change[] = findings
    .filter((result) => summaryFqdns.has(result.domain))
    .flatMap((f) => f.items.filter((item) => item.recurrence === "new").map((finding) => ({ domain: f.domain, finding })));
  const changes = newFindings.slice(0, 5);

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
        <KpiTile
          label="Hallazgos críticos"
          value={critical}
          tone={critical > 0 ? "red" : undefined}
          hint={partialDomains.length > 0 ? "Cobertura parcial: puede no estar al día" : undefined}
        />
        <KpiTile label="Escaneos en curso" value={running} />
      </div>
      {partialDomains.length > 0 && (
        <InlineAlert tone="warning">
          <strong>Cobertura parcial.</strong> El último escaneo de {partialDomains.join(", ")} no revisó todo: alguna fuente falló,
          revisó solo una parte de sus repos o IP, o hay reglas que las fuentes actuales todavía no pueden revisar. Su score y su letra
          pueden estar incompletos, y los conteos muestran los hallazgos abiertos registrados y pueden no estar al día.
        </InlineAlert>
      )}
      <FindingsByTypeChart series={findings.map(({ domain, items }, index) => ({
        domain,
        findings: items,
        coverage: coverage[index] ?? "unscanned",
        // El mismo estado que la tabla Dominios: sin score por falta de autorización, por vencido o por no tener escaneo.
        stateLabel: visible[index] ? unscoredLabel(visible[index]) : "Sin calcular",
      }))} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <DomainsRiskTable domains={rows} lastScans={lastScans} partialDomains={new Set(partialDomains)} canOpenDetail={canAccessSection(user.role, "detalle")} />
        <RecentChanges summaries={summaries} changes={changes} more={newFindings.length - changes.length} />
      </div>
    </div>
  );
}

/** Lo que dice la columna Nivel de la tabla Dominios para un dominio sin score. */
function unscoredLabel(domain: Parameters<typeof domainState>[0]): string {
  const state = domainState(domain);
  return state.label === "Autorizado" ? "Sin calcular" : state.label;
}
