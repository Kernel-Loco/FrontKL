import { Card } from "@/components/ui/Card";
import { CATEGORY_LABELS, SEVERITY_LABELS } from "@/config/labels";
import type { Category, DomainFinding, SeverityCounts } from "@/types";

interface DomainFindingSeries {
  domain: string;
  /** Por categoría: la lista de /findings (analista y admin). */
  findings?: DomainFinding[];
  /** Por severidad: los conteos open_findings de /domains, sin pedir /findings (gerente, RC-280). */
  severityCounts?: SeverityCounts;
  coverage: "complete" | "partial" | "unscanned";
  /** Para un dominio sin score: lo mismo que dice la tabla Dominios (Sin autorización, Vencido, Sin escaneo completo...). */
  stateLabel: string;
}

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];
const SEVERITIES = Object.keys(SEVERITY_LABELS) as (keyof SeverityCounts)[];
/** Tonos por dominio en orden fijo (globals.css, --lt-series-*). Del noveno en adelante van juntos en gris como «Otros». */
const SERIES = 8;
const seriesColor = (index: number) => (index < SERIES ? `var(--lt-series-${index + 1})` : "var(--color-lt-faint)");

/**
 * Hallazgos abiertos por categoría (o severidad, para el gerente) y dominio (RC-375). Una barra horizontal por grupo,
 * partida por dominio con un tono propio, y el total al final. Así se compara de un vistazo qué categoría pesa más y
 * qué dominio la carga, sin el bosque de columnas vacías del gráfico anterior.
 */
export function FindingsByTypeChart({ series, groupBy = "category" }: { series: DomainFindingSeries[]; groupBy?: "category" | "severity" }) {
  const groups: { id: string; label: string }[] = groupBy === "severity"
    ? SEVERITIES.map((id) => ({ id, label: SEVERITY_LABELS[id] }))
    : CATEGORIES.map((id) => ({ id, label: CATEGORY_LABELS[id] }));
  const groupWord = groupBy === "severity" ? "severidad" : "categoría";
  const counts = series.map(({ domain, findings, severityCounts, coverage, stateLabel }) => ({
    domain,
    coverage,
    stateLabel,
    // Cuenta los hallazgos abiertos registrados con cualquier cobertura: un primer escaneo en curso o caído ya puede
    // tener hallazgos sin score, y hoy todo escaneo queda parcial. La leyenda, la descripción y el aviso dicen qué dominios
    // no tienen cobertura completa.
    values: groupBy === "severity"
      ? SEVERITIES.map((severity) => severityCounts?.[severity] ?? 0)
      : CATEGORIES.map((category) => (findings ?? []).filter((finding) => finding.category === category).length),
  }));
  const rows = groups.map((group, groupIndex) => {
    const parts = counts
      .map(({ domain }, domainIndex) => ({ domain, domainIndex, value: counts[domainIndex].values[groupIndex] }))
      .filter((part) => part.value > 0);
    return { ...group, parts, total: parts.reduce((sum, part) => sum + part.value, 0) };
  });
  const maxTotal = Math.max(1, ...rows.map((row) => row.total));
  const partial = counts.filter((item) => item.coverage === "partial").length;
  const unscored = counts.filter((item) => item.coverage === "unscanned").length;
  const incomplete = partial + unscored > 0;
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const gaps = [partial > 0 ? `${partial} con cobertura parcial` : "", unscored > 0 ? `${unscored} sin score` : ""]
    .filter(Boolean)
    .join(" y ");
  const description = `${total} ${total === 1 ? "hallazgo" : "hallazgos"} en ${counts.length} ${counts.length === 1 ? "dominio" : "dominios"}${incomplete ? `, ${gaps}` : ""}`;
  const others = Math.max(0, counts.length - SERIES);

  return (
    <Card title={`Hallazgos abiertos por ${groupWord} y dominio`} description={description}>
      {counts.length === 0 ? (
        <p className="text-sm text-lt-muted">No hay dominios activos para mostrar.</p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <ul aria-label={`Hallazgos abiertos por ${groupWord}`} className="space-y-5">
            {rows.map((row) => (
              <li key={row.id}>
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <span className="text-sm text-lt-text">{row.label}</span>
                  <span className={`text-sm font-semibold tabular-nums ${row.total ? "text-lt-text" : "text-lt-faint"}`}>{row.total}</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-lt-raised/60">
                  {row.total > 0 && (
                    <div className="flex h-full gap-0.5" style={{ width: `${(row.total / maxTotal) * 100}%` }}>
                      {row.parts.map((part) => (
                        <span
                          key={part.domain}
                          title={`${part.domain} · ${row.label}: ${part.value}`}
                          className="h-full first:rounded-l-full last:rounded-r-full"
                          style={{ flexGrow: part.value, flexBasis: 0, backgroundColor: seriesColor(part.domainIndex) }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <p className="sr-only">
                  {row.total === 0
                    ? "Sin hallazgos abiertos."
                    : row.parts.map((part) => `${part.domain}: ${part.value}`).join(", ")}
                </p>
              </li>
            ))}
          </ul>
          <ul aria-label="Dominios" className="space-y-2.5 border-lt-border lg:border-l lg:pl-6">
            {counts.slice(0, SERIES).map(({ domain, coverage, stateLabel }, index) => (
              <li key={domain} className="flex min-w-0 items-center gap-2.5 text-sm">
                <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: seriesColor(index) }} />
                <span className="min-w-0 truncate text-lt-text" title={domain}>{domain}</span>
                {coverage !== "complete" && (
                  <span className="ml-auto shrink-0 text-xs text-lt-muted">{coverage === "partial" ? "Parcial" : stateLabel}</span>
                )}
              </li>
            ))}
            {others > 0 && (
              <li className="flex items-center gap-2.5 text-sm">
                <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: seriesColor(SERIES) }} />
                <span className="text-lt-muted">Otros {others} dominios</span>
              </li>
            )}
          </ul>
          {total === 0 && (
            <p className="text-sm text-lt-muted lg:col-span-2">
              {incomplete
                ? "No hay hallazgos abiertos registrados, pero con cobertura parcial o dominios sin score eso no confirma que no existan."
                : "No se encontraron hallazgos abiertos."}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
