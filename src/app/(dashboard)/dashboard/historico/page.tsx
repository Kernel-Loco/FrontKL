import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { checkSectionAccess } from "@/components/dashboard/SectionAccess";
import { DomainTabs, domainTabs } from "@/components/screens/detalle/DomainTabs";
import { CompareScans } from "@/components/screens/historico/CompareScans";
import { Delta } from "@/components/screens/historico/Delta";
import { ReportsCard } from "@/components/screens/historico/ReportsCard";
import { ScoreChart } from "@/components/screens/historico/ScoreChart";
import { DomainPicker } from "@/components/screens/shared/DomainPicker";
import { ReportButton } from "@/components/screens/shared/ReportButton";
import { DataExport } from "@/components/screens/shared/DataExport";
import { scoredDomains } from "@/components/screens/shared/domainState";
import { Card, TableWrap, TD, TH, TR } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { BAND_LABELS, SCORE_METHOD_LABELS, SCORE_REASON_LABELS } from "@/config/labels";
import { can, canAccessSection, SECTIONS } from "@/config/permissions";
import { formatDate } from "@/lib/format";
import { getDomainFindings, getDomains, getScoreHistory } from "@/services/queries";
import { getReports } from "@/services/reportService";

export const metadata: Metadata = { title: SECTIONS.historico.label };

type Props = { searchParams: Promise<{ dominio?: string | string[] }> };

export default async function HistoricoPage({ searchParams }: Props) {
  const { user, forbidden } = await checkSectionAccess("historico");
  if (forbidden) return forbidden;

  const [domainResponse, reports] = await Promise.all([getDomains(), getReports()]);
  const domains = domainResponse.items;
  const options = scoredDomains(domains).map((d) => d.fqdn);
  const { dominio } = await searchParams;
  const fqdn = typeof dominio === "string" && options.includes(dominio) ? dominio : options[0];
  const canReport = can(user.role, "request_report");
  // Los reportes siguen simulados: solo se muestran los de los dominios de tu empresa.
  const orgReports = reports.items.filter((r) => r.domain === null || domains.some((d) => d.fqdn === r.domain));
  const reportData = canReport
    ? {
        domains: domains.map(({ fqdn, score, band, last_scan_at, open_findings }) => ({ fqdn, score, band, last_scan_at, open_findings })),
        findings: (await Promise.all(domains.map(async (domain) => {
          const result = await getDomainFindings(domain.fqdn);
          return result.items.map((finding) => ({ domain: domain.fqdn, finding }));
        }))).flat(),
      }
    : undefined;

  if (!fqdn) {
    return (
      <div className="space-y-8">
        <PageHeader title="Histórico de escaneos" />
        <ReportsCard reports={orgReports} reportData={reportData} />
      </div>
    );
  }

  const [history, findings] = await Promise.all([getScoreHistory(fqdn), getDomainFindings(fqdn)]);
  const points = history.items;
  const scanCount = points.filter((point) => point.reason === "scan").length;
  const correctionCount = points.filter((point) => point.reason === "correction").length;
  const recalcCount = points.length - scanCount - correctionCount;
  const countParts = [
    `${scanCount} ${scanCount === 1 ? "escaneo" : "escaneos"}`,
    ...(recalcCount > 0 ? [`${recalcCount} ${recalcCount === 1 ? "recálculo" : "recálculos"}`] : []),
    ...(correctionCount > 0 ? [`${correctionCount} ${correctionCount === 1 ? "corrección" : "correcciones"}`] : []),
  ];
  const newestFirst = points.map((p, i) => ({ point: p, change: i > 0 ? p.score - points[i - 1]!.score : 0, first: i === 0 })).reverse();
  const hasPartialCoverage = points.some((point) => point.partial_coverage);
  const exportRows = points.map((point) => ({
    score_id: point.score_id,
    domain: fqdn,
    computed_at: point.computed_at,
    score: point.score,
    band: BAND_LABELS[point.band],
    weighted: point.weighted,
    floor: point.floor,
    floor_applied: point.floor_applied,
    critical_open: point.critical_open,
    method: SCORE_METHOD_LABELS[point.method],
    rule_set_version: point.rule_set_version,
    reason: point.reason,
    partial_coverage: point.partial_coverage,
    new_findings: point.partial_coverage || point.reason !== "scan" ? null : point.new_findings,
    resolved_findings: point.partial_coverage || point.reason !== "scan" ? null : point.resolved_findings,
    categories: point.categories,
  }));
  const canOpenDetail = canAccessSection(user.role, "detalle");
  const domainReports = orgReports.filter((r) => r.domain === fqdn || r.domain === null);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[{ label: fqdn, href: canOpenDetail ? `/dashboard/dominios/${fqdn}` : undefined }, { label: "Histórico" }]}
        title="Histórico de escaneos"
        actions={<DomainPicker domains={options} value={fqdn} />}
      />
      {canOpenDetail && <DomainTabs tabs={domainTabs(fqdn, findings.total, "historico", canAccessSection(user.role, "hallazgos"))} />}

      {hasPartialCoverage && (
        <InlineAlert tone="warning">
          <strong>Cobertura parcial.</strong> Algunos escaneos no pudieron consultar o revisar todas las fuentes. Sus conteos de hallazgos nuevos y resueltos se muestran como no disponibles.
        </InlineAlert>
      )}

      <Card
        title="Riesgo global en el tiempo"
        action={(
          <div className="flex flex-wrap items-center justify-end gap-3">
            <span>
              {countParts.length > 1 ? `${countParts.slice(0, -1).join(", ")} y ${countParts.at(-1)}` : countParts[0]}
            </span>
            <DataExport filename={`historico-${fqdn}`} rows={exportRows} />
          </div>
        )}
      >
        {points.length > 0 ? <ScoreChart points={points} /> : <EmptyState title="Sin escaneos todavía" />}
      </Card>

      {points.length > 0 && (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Card title="Escaneos" padded={false}>
            <TableWrap>
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr>
                    <th scope="col" className={TH}>Fecha</th>
                    <th scope="col" className={TH}>Riesgo</th>
                    <th scope="col" className={TH}>Cambio</th>
                    <th scope="col" className={TH}>Nuevos</th>
                    <th scope="col" className={TH}>Resueltos</th>
                    <th scope="col" className={TH}>Cobertura</th>
                    <th scope="col" className={TH}><span className="sr-only">Reporte</span></th>
                  </tr>
                </thead>
                <tbody>
                  {newestFirst.map(({ point, change, first }, i) => (
                    <tr key={point.score_id} className={`${TR} ${i === 0 ? "bg-lt-nav/50" : ""}`}>
                      <td className={`${TD} whitespace-nowrap`}>
                        {formatDate(point.computed_at)}
                        {point.reason !== "scan" && (
                          <span className="block whitespace-normal text-xs text-lt-muted">{SCORE_REASON_LABELS[point.reason]}</span>
                        )}
                      </td>
                      <td className={`${TD} font-semibold tabular-nums`}>{point.score}</td>
                      <td className={TD}>{first || point.reason === "correction" ? <span className="text-lt-faint">—</span> : <Delta value={change} />}</td>
                      <td className={`${TD} tabular-nums`}>{point.partial_coverage || point.reason !== "scan" ? "—" : point.new_findings}</td>
                      <td className={`${TD} tabular-nums`}>{point.partial_coverage || point.reason !== "scan" ? "—" : point.resolved_findings}</td>
                      <td className={TD}>
                        {point.partial_coverage ? (
                          <span className="rounded-sm border border-lt-amber/30 bg-lt-amber/10 px-2 py-1 text-xs text-lt-amber">Parcial</span>
                        ) : (
                          <span className="text-xs text-lt-muted">Completa</span>
                        )}
                      </td>
                      <td className={`${TD} text-right`}>
                        {canReport && (
                          <ReportButton
                            domain={fqdn}
                            periodStart={(newestFirst[i + 1]?.point.computed_at ?? point.computed_at).slice(0, 10)}
                            periodEnd={point.computed_at.slice(0, 10)}
                            label="Generar reporte"
                            variant="ghost"
                            size="sm"
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </Card>
          {points.length >= 2 ? (
            <CompareScans key={fqdn} points={points} />
          ) : (
            <Card title="Comparar escaneos">
              <p className="text-sm text-lt-muted">Se necesitan al menos dos escaneos para comparar.</p>
            </Card>
          )}
        </div>
      )}

      <ReportsCard reports={domainReports} reportData={reportData} />
    </div>
  );
}
