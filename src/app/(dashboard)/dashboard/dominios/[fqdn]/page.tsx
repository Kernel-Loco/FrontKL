import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { checkSectionAccess } from "@/components/dashboard/SectionAccess";
import { AssetsCard } from "@/components/screens/detalle/AssetsCard";
import { CategoryBars } from "@/components/screens/detalle/CategoryBars";
import { DomainTabs, domainTabs } from "@/components/screens/detalle/DomainTabs";
import { RiskGauge } from "@/components/screens/detalle/RiskGauge";
import { ReportButton } from "@/components/screens/shared/ReportButton";
import { ScanButton } from "@/components/screens/shared/ScanButton";
import { TEXT_LINK } from "@/components/ui/ActionButton";
import { SeverityBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { CATEGORY_LABELS, SCAN_BLOCK_REASON_LABELS } from "@/config/labels";
import { can, canAccessSection } from "@/config/permissions";
import { formatDate, formatDateTime } from "@/lib/format";
import { getDomainAssets, getDomainFindings, getDomains, getDomainScore, getScoreHistory } from "@/services/queries";

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
  const [findings, history, assets] = await Promise.all([getDomainFindings(fqdn), getScoreHistory(fqdn), getDomainAssets(fqdn)]);
  const score = domain.score !== null ? await getDomainScore(fqdn) : null;
  const points = history.items;
  const delta = points.length >= 2 ? points[points.length - 1]!.score - points[points.length - 2]!.score : null;
  const top = findings.items.slice(0, 4);
  const blocked = domain.scan_eligibility.can_scan ? undefined : domain.scan_eligibility.reasons.map((r) => SCAN_BLOCK_REASON_LABELS[r]).join(" · ");
  const today = new Date().toISOString().slice(0, 10);

  const subtitle = [
    domain.last_scan_at ? `Último escaneo: ${formatDateTime(domain.last_scan_at)}` : "Sin escaneos todavía",
    domain.authorization.valid_until ? `Autorizado hasta ${formatDate(domain.authorization.valid_until)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

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
      <DomainTabs tabs={domainTabs(fqdn, findings.total, "resumen", canSeeFindings)} />

      {blocked && <InlineAlert tone="warning">Este dominio no se puede escanear ni exportar: {blocked}.</InlineAlert>}

      {score ? (
        <>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
            <Card title="Riesgo global">
              <div className="py-2">
                <RiskGauge
                  score={score.score}
                  band={score.band}
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
              <CategoryBars categories={score.categories} />
              {score.partial_coverage && (
                <InlineAlert tone="warning" className="mt-5">
                  Alguna fuente falló en el último escaneo: el score puede estar incompleto.
                </InlineAlert>
              )}
            </Card>
          </div>
          <Card
            title="Hallazgos más críticos"
            padded={false}
            action={
              canSeeFindings && findings.total > 0 ? (
                <Link href={`/dashboard/hallazgos?dominio=${encodeURIComponent(fqdn)}`} className={TEXT_LINK}>
                  Ver los {findings.total} hallazgos
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
        </>
      ) : (
        <Card>
          <EmptyState title="Este dominio aún no tiene score">
            El score aparece después del primer escaneo, que solo se puede hacer con autorización vigente y registro TXT verificado.
          </EmptyState>
        </Card>
      )}

      <AssetsCard assets={assets.items} />
    </div>
  );
}
