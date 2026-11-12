import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { checkSectionAccess } from "@/components/dashboard/SectionAccess";
import { AssetsCard } from "@/components/screens/detalle/AssetsCard";
import { CategoryBars } from "@/components/screens/detalle/CategoryBars";
import { DomainTabs, domainTabs } from "@/components/screens/detalle/DomainTabs";
import { KriPanel } from "@/components/screens/detalle/KriPanel";
import { RiskGauge } from "@/components/screens/detalle/RiskGauge";
import { ReportButton } from "@/components/screens/shared/ReportButton";
import { ScanButton } from "@/components/screens/shared/ScanButton";
import { failedScanAt, unscoredLabel } from "@/components/screens/shared/domainState";
import { AvisoSimulado } from "@/components/ui/AvisoSimulado";
import { TEXT_LINK } from "@/components/ui/ActionButton";
import { SeverityBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { CATEGORY_LABELS, SCAN_BLOCK_REASON_LABELS } from "@/config/labels";
import { can, canAccessSection } from "@/config/permissions";
import { formatDate, formatDateTime } from "@/lib/format";
import { ServiceError } from "@/services/errors";
import { getDomainAssets, getDomainFindings, getDomains, getDomainScore, getScans, getScoreHistory } from "@/services/queries";

type Props = { params: Promise<{ fqdn: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: decodeURIComponent((await params).fqdn) };
}

export default async function DomainDetailPage({ params }: Props) {
  const { user, forbidden } = await checkSectionAccess("detalle");
  if (forbidden) return forbidden;

  const fqdn = decodeURIComponent((await params).fqdn);
  const domains = await getDomains();
  const domain = domains.items.find((d) => d.fqdn === fqdn);
  if (!domain) notFound();

  const canSeeFindings = canAccessSection(user.role, "hallazgos");
  const [findings, history, assets, scans] = await Promise.all([
    getDomainFindings(fqdn),
    getScoreHistory(fqdn),
    getDomainAssets(fqdn),
    // Si /scans falla, el detalle sigue con la fecha del dominio.
    getScans().catch((error: unknown) => {
      if (error instanceof ServiceError) return null;
      throw error;
    }),
  ]);
  const score = domain.score !== null ? await getDomainScore(fqdn) : null;
  const points = history.items;
  const delta = points.length >= 2 ? points[points.length - 1]!.score - points[points.length - 2]!.score : null;
  const top = findings.items.slice(0, 4);
  const blocked = domain.scan_eligibility.can_scan ? undefined : domain.scan_eligibility.reasons.map((r) => SCAN_BLOCK_REASON_LABELS[r]).join(" · ");
  const today = new Date().toISOString().slice(0, 10);

  // /scans trae los últimos 50 de la empresa, del más nuevo al más viejo; un dominio tiene a lo más un escaneo activo.
  const ownScans = scans?.items.filter((s) => s.domain === fqdn) ?? [];
  const running = ownScans[0]?.status === "queued" || ownScans[0]?.status === "running";
  const failedAt = failedScanAt(domain, ownScans.find((s) => s.finished_at));
  // Si el escaneo fallido también calculó el riesgo (misma fecha), no hay un riesgo anterior que nombrar.
  const riskAt = domain.last_scan_at && (!failedAt || Date.parse(domain.last_scan_at) < Date.parse(failedAt)) ? domain.last_scan_at : null;
  // Sin score, el mismo estado que la tabla Dominios: «Sin autorización», «Vencido»... o «Sin calcular» si está autorizado.
  const unscored = unscoredLabel(domain);
  const subtitle = [
    running ? "Escaneo en curso" : null,
    failedAt ? `Último escaneo: ${formatDateTime(failedAt)}, falló` : null,
    riskAt
      ? `${failedAt ? "Último con riesgo" : "Último escaneo"}: ${formatDateTime(riskAt)}`
      : failedAt
        ? null
        : domain.score === null
          ? unscored === "Sin calcular" ? "Sin riesgo calculado todavía" : unscored
          : "Sin fecha de escaneo",
    domain.authorization.valid_until
      ? `${domain.authorization.status === "expired" ? "Venció el" : "Autorizado hasta"} ${formatDate(domain.authorization.valid_until)}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const pendingNote = [
    running
      ? "Hay un escaneo en curso: el riesgo se calcula al cerrarlo."
      : failedAt
        ? "El último escaneo falló antes de calcular el riesgo."
        : "El riesgo se calcula al cerrar un escaneo; uno que se cae antes no lo calcula.",
    top.length > 0 ? "Abajo están los hallazgos que alcanzaron a registrar las fuentes." : "",
    "Solo se puede escanear con autorización vigente y registro TXT verificado.",
  ]
    .filter(Boolean)
    .join(" ");

  const topFindings = (
    <Card
      title="Hallazgos más críticos"
      padded={false}
      action={
        canSeeFindings && findings.total > 0 ? (
          <Link href={`/dashboard/hallazgos?dominio=${encodeURIComponent(fqdn)}`} className={TEXT_LINK}>
            {findings.total === 1 ? "Ver el hallazgo" : `Ver los ${findings.total} hallazgos`}
          </Link>
        ) : undefined
      }
    >
      {top.length === 0 ? (
        <EmptyState title="Sin hallazgos abiertos" />
      ) : (
        <ul>
          {top.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-lt-border px-5 py-3.5 first:border-t-0">
              <span className="min-w-0 flex-1 text-sm text-lt-text">{f.title}</span>
              <span className="w-36 text-xs text-lt-muted">{CATEGORY_LABELS[f.category]}</span>
              <SeverityBadge severity={f.severity} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[{ label: "Dashboard", href: "/dashboard" }, { label: fqdn }]}
        title={<span className="font-mono">{fqdn}</span>}
        description={subtitle}
        actions={
          <>
            {can(user.role, "request_report") && (
              <ReportButton domain={fqdn} periodStart={points[0]?.computed_at.slice(0, 10) ?? today} periodEnd={today} disabledReason={blocked} />
            )}
            {can(user.role, "request_scan") && <ScanButton domains={domains.items} fixedDomain={fqdn} label="Escanear ahora" />}
          </>
        }
      />
      <DomainTabs tabs={domainTabs(fqdn, findings.total, "resumen", canSeeFindings, domain.score !== null)} />
      {can(user.role, "request_report") && <AvisoSimulado acciones={["requestReport"]} solo="«Exportar PDF»" />}

      {blocked && <InlineAlert tone="warning">Este dominio no se puede escanear ni exportar: {blocked}.</InlineAlert>}

      {score ? (
        <>
          <KriPanel kris={score.kris} subcategories={score.subcategories} mapVersion={score.kri_map_version} />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
            <Card title="Riesgo global">
              <div className="py-2">
                <RiskGauge
                  score={score.score}
                  band={score.band}
                  grade={score.grade}
                  partial={score.partial_coverage}
                  delta={delta}
                  reason={score.reason}
                  previousReason={points.length >= 2 ? points[points.length - 2]!.reason : null}
                />
              </div>
              {score.floor_applied && (
                <InlineAlert tone="warning" className="mt-4">
                  Subido a {score.floor} por {score.critical_open} hallazgo{score.critical_open === 1 ? "" : "s"} crítico
                  {score.critical_open === 1 ? "" : "s"} vigente{score.critical_open === 1 ? "" : "s"}; la suma ponderada da {score.weighted}.
                </InlineAlert>
              )}
            </Card>
            <Card title="Riesgo por categoría" action="Ponderación configurable">
              <CategoryBars categories={score.categories} subcategories={score.subcategories} kris={score.kris} />
              {score.partial_coverage && (
                <InlineAlert tone="warning" className="mt-5">
                  Cobertura parcial: alguna fuente falló, revisó solo una parte de sus repos o IP, o hay reglas que
                  las fuentes actuales todavía no pueden revisar. El score y su letra pueden estar incompletos.
                </InlineAlert>
              )}
            </Card>
          </div>
          {topFindings}
        </>
      ) : (
        <>
          <Card>
            <EmptyState title={unscored === "Sin calcular" ? "Riesgo sin calcular" : unscored}>{pendingNote}</EmptyState>
          </Card>
          {top.length > 0 && topFindings}
        </>
      )}

      <AssetsCard assets={assets.items} />
    </div>
  );
}
