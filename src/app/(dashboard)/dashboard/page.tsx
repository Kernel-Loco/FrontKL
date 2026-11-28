import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { checkSectionAccess } from "@/components/dashboard/SectionAccess";
import { DomainsRiskTable } from "@/components/screens/dashboard/DomainsRiskTable";
import { FindingsByTypeChart } from "@/components/screens/dashboard/FindingsByTypeChart";
import { KpiTile } from "@/components/screens/dashboard/KpiTile";
import { RecentChanges, type Change, type ScanSummary } from "@/components/screens/dashboard/RecentChanges";
import { ScanButton } from "@/components/screens/shared/ScanButton";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { scoredDomains, unscannedDomains, unscoredLabel } from "@/components/screens/shared/domainState";
import { coverageIncomplete, criticalKpi } from "@/lib/cobertura";
import { BAND_TONE } from "@/components/ui/tones";
import { can, canAccessSection } from "@/config/permissions";
import { mapLimit, panelAssets } from "@/lib/activosNuevos";
import { bandaEnRangos } from "@/lib/bandas";
import { ServiceError } from "@/services/errors";
import { getDomainAssets, getDomainFindings, getDomainScore, getDomains, getScans, getScoringWeights } from "@/services/queries";
import type { Scan } from "@/types";
import { tx, localized } from "@/i18n/tx";

export const metadata: Metadata = localized({ title: "Dashboard" });

export default async function DashboardPage() {
  const { user, forbidden } = await checkSectionAccess("dashboard");
  if (forbidden) return forbidden;

  const [domains, scans, weights] = await Promise.all([getDomains(), getScans(), getScoringWeights()]);
  const visible = domains.items.filter((d) => d.status !== "removed");
  const scored = scoredDomains(visible);
  const average = scored.length ? Math.round(scored.reduce((sum, d) => sum + (d.score ?? 0), 0) / scored.length) : null;
  // El promedio no es un score guardado: su color sale de las bandas del juego activo de la empresa (RC-237).
  const averageBand = average !== null ? bandaEnRangos(average, weights.bands) : null;
  const running = scans.items.filter((s) => s.status === "queued" || s.status === "running").length;

  // El gráfico incluye todos los dominios activos; el panel de cambios, los que tienen score o un escaneo terminado.
  // Sin la sección Hallazgos (gerente) no se pide /findings, que le responde 403: el gráfico va por severidad con los
  // conteos de /domains y el panel no lista hallazgos nuevos (RC-280).
  const canSeeFindings = canAccessSection(user.role, "hallazgos");
  const [findings, coverage] = await Promise.all([
    canSeeFindings ? Promise.all(visible.map((domain) => getDomainFindings(domain.fqdn))) : Promise.resolve(null),
    Promise.all(visible.map(async (domain) => {
      if (domain.score === null) return "unscanned" as const;
      return coverageIncomplete(await getDomainScore(domain.fqdn)) ? "partial" as const : "complete" as const;
    })),
  ]);
  const partialDomains = visible.filter((_, index) => coverage[index] === "partial").map((domain) => domain.fqdn);
  // Cuenta los críticos abiertos registrados con cualquier cobertura (hoy todo escaneo queda parcial); el hint lo avisa.
  const critical = visible.reduce((sum, domain) => sum + domain.open_findings.critical, 0);
  // Un dominio autorizado sin score no cuenta como 0 críticos, y con dominios parciales o sin escaneo completo el KPI no
  // dice 0 a secas: el 0 va en la pista (RC-69, RC-229). open_findings ya usa la severidad del último score, la misma de
  // la lista de hallazgos.
  const unscanned = unscannedDomains(visible).length;
  const kpi = criticalKpi(critical, scored.length, partialDomains.length, unscanned);
  const criticalHint = kpi.hint;
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
        newAssets: null,
        firstScan: false,
      }];
    }
    if (domain.score === null) return [];
    // Con score pero fuera de esos 50: queda la fecha del dominio, si la hay, sin conteos.
    return [{
      domain: domain.fqdn,
      finishedAt: domain.last_scan_at,
      status: null,
      newFindings: null,
      resolvedFindings: null,
      newAssets: null,
      firstScan: false,
    }];
  });
  // Activos que dejó el último escaneo de cada dominio (RC-219). La base sale del mismo /scans general que da la fecha
  // del panel. Si ahí no está el anterior que sí corrió, o el dominio tiene score pero su último escaneo quedó fuera de
  // esos 50, se leen los 5 más nuevos del dominio (RC-318) y se usan solo si su último es el escaneo de la fecha del
  // panel (panelAssets). El inventario (first_seen_at y el 'emitido' de ct_logs) se lee solo si hay con qué comparar,
  // con a lo más 4 dominios a la vez: cada /scans abandona los vencidos con un UPDATE. Si una lectura falla, sin conteos.
  const assetChanges = await mapLimit(summaries, 4, async (s) => {
    try {
      return await panelAssets(
        s,
        scans,
        (fqdn) => getScans({ domain: fqdn, limit: 5 }),
        async (fqdn) => (await getDomainAssets(fqdn)).items,
      );
    } catch (error) {
      if (error instanceof ServiceError) return { firstScan: false, newAssets: null };
      throw error;
    }
  });
  const panel = summaries.map((s, index) => ({ ...s, ...assetChanges[index] }));
  // Los resueltos no se listan: /findings solo trae abiertos.
  const summaryFqdns = new Set(summaries.map((s) => s.domain));
  const newFindings: Change[] = (findings ?? [])
    .filter((result) => summaryFqdns.has(result.domain))
    .flatMap((f) => f.items.filter((item) => item.recurrence === "new").map((finding) => ({ domain: f.domain, finding })));
  const changes = newFindings.slice(0, 5);

  // Primero los que tienen score (de mayor a menor riesgo), luego los demás.
  const rows = [...scored, ...visible.filter((d) => d.score === null)];

  return (
    <div className="space-y-8">
      <PageHeader
        title={tx("Dashboard")}
        description={tx("Riesgo de todos los dominios autorizados.")}
        actions={can(user.role, "request_scan") ? <ScanButton domains={visible} /> : undefined}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label={tx("Dominios monitoreados")} value={visible.filter((d) => d.status === "verified").length} />
        <KpiTile label={tx("Riesgo promedio")} value={average ?? "—"} tone={averageBand ? BAND_TONE[averageBand] : undefined} />
        <KpiTile
          label={tx("Hallazgos críticos")}
          value={kpi.value}
          tone={critical > 0 ? "red" : undefined}
          hint={criticalHint ? criticalHint.charAt(0).toUpperCase() + criticalHint.slice(1) : undefined}
        />
        <KpiTile label={tx("Escaneos en curso")} value={running} />
      </div>
      {partialDomains.length > 0 && (
        <InlineAlert tone="warning">
          <strong>{tx("Cobertura parcial.")}</strong> {" "}{tx("El último escaneo de")}{" "}{partialDomains.join(", ")} {" "}{tx("no revisó todo: alguna fuente falló o no corrió, revisó solo una parte de sus repos o IP, o hay reglas que las fuentes actuales todavía no pueden revisar. Su score y su letra pueden estar incompletos, y los conteos muestran los hallazgos abiertos registrados y pueden no estar al día.")}</InlineAlert>
      )}
      <FindingsByTypeChart
        groupBy={findings ? "category" : "severity"}
        series={visible.map((domain, index) => ({
          domain: domain.fqdn,
          findings: findings?.[index]?.items,
          severityCounts: domain.open_findings,
          coverage: coverage[index] ?? "unscanned",
          // El mismo estado que la tabla Dominios: sin score por falta de autorización, por vencido o por no tener escaneo.
          stateLabel: unscoredLabel(domain),
        }))}
      />
      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <DomainsRiskTable domains={rows} lastScans={lastScans} partialDomains={new Set(partialDomains)} canOpenDetail={canAccessSection(user.role, "detalle")} />
        <RecentChanges summaries={panel} changes={changes} more={newFindings.length - changes.length} />
      </div>
    </div>
  );
}
