import { Card } from "@/components/ui/Card";
import { CATEGORY_LABELS } from "@/config/labels";
import type { Category, DomainFinding } from "@/types";

interface DomainFindingSeries {
  domain: string;
  findings: DomainFinding[];
  coverage: "complete" | "partial" | "unscanned";
}

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];
const BLUE_PALETTE = ["#7dd3fc", "#60a5fa", "#3b82f6", "#2563eb", "#93c5fd", "#38bdf8", "#818cf8", "#1d4ed8"];
const HEIGHT = 270;
const PADDING = { top: 18, right: 14, bottom: 58, left: 34 };

export function FindingsByTypeChart({ series }: { series: DomainFindingSeries[] }) {
  const counts = series.map(({ domain, findings, coverage }) => ({
    domain,
    coverage,
    // Cuenta los hallazgos abiertos registrados con cualquier cobertura: un primer escaneo en curso o caído ya puede
    // tener hallazgos sin score, y hoy todo escaneo queda parcial. La leyenda y el aviso dicen la cobertura.
    values: CATEGORIES.map((category) => findings.filter((finding) => finding.category === category).length),
  }));
  const maxCount = Math.max(0, ...counts.flatMap(({ values }) => values));
  const scaleMax = Math.max(1, maxCount);
  const ticks = maxCount === 0 ? [] : [...new Set([0, Math.ceil(scaleMax / 2), scaleMax])];
  const groupWidth = Math.max(160, counts.length * 20 + 36);
  const chartWidth = PADDING.left + CATEGORIES.length * groupWidth + PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const gap = series.length > 8 ? 1 : 3;
  const barWidth = Math.min(18, (groupWidth - 42 - gap * Math.max(0, series.length - 1)) / Math.max(1, series.length));
  const incomplete = counts.some((item) => item.coverage !== "complete");
  const total = counts.reduce((sum, item) => sum + item.values.reduce((categoryTotal, value) => categoryTotal + value, 0), 0);
  const description = `${total} hallazgo(s) en ${counts.length} dominio(s)${incomplete ? ", no todos con cobertura completa" : ""}`;

  return (
    <Card title="Hallazgos abiertos por categoría y dominio" description={description}>
      {counts.length === 0 ? (
        <p className="text-sm text-lt-muted">No hay dominios activos para mostrar.</p>
      ) : (
        <>
          <ul aria-label="Dominios" className="mb-4 flex flex-wrap gap-x-4 gap-y-2">
            {counts.map(({ domain, coverage }, index) => (
              <li key={domain} className="flex min-w-0 items-center gap-2 text-xs text-lt-muted">
                <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: BLUE_PALETTE[index % BLUE_PALETTE.length] }} />
                <span className="max-w-56 truncate">{domain}</span>
                {coverage !== "complete" && (
                  <span className="shrink-0 rounded-sm border border-lt-border px-1.5 py-0.5 text-[10px]">
                    {coverage === "partial" ? "Parcial" : "Sin escaneo terminado"}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <div className="overflow-x-auto">
            <svg
              width={chartWidth}
              height={HEIGHT}
              viewBox={`0 0 ${chartWidth} ${HEIGHT}`}
              role="img"
              aria-labelledby="findings-chart-title findings-chart-description"
              className="block max-w-none"
            >
              <title id="findings-chart-title">Hallazgos abiertos por categoría y dominio</title>
              <desc id="findings-chart-description">
                {counts.map(({ domain, coverage, values }) =>
                  `${domain}${coverage === "complete" ? "" : coverage === "partial" ? " (cobertura parcial)" : " (sin escaneo terminado)"}: ${CATEGORIES.map((category, index) => `${CATEGORY_LABELS[category]} ${values[index]}`).join(", ")}`,
                ).join(". ")}
              </desc>
              {ticks.map((tick) => {
                const y = PADDING.top + plotHeight - (tick / scaleMax) * plotHeight;
                return (
                  <g key={tick}>
                    <line x1={PADDING.left} x2={chartWidth - PADDING.right} y1={y} y2={y} className="stroke-lt-border" />
                    <text x={PADDING.left - 8} y={y} dy="0.35em" textAnchor="end" className="fill-lt-muted font-mono text-[11px]">
                      {tick}
                    </text>
                  </g>
                );
              })}
              {CATEGORIES.map((category, categoryIndex) => {
                const groupStart = PADDING.left + categoryIndex * groupWidth;
                const groupCenter = groupStart + groupWidth / 2;
                const clusterWidth = counts.length * barWidth + Math.max(0, counts.length - 1) * gap;
                const clusterStart = groupCenter - clusterWidth / 2;
                const labelLines = CATEGORY_LABELS[category].split(" ");

                return (
                  <g key={category}>
                    {counts.map(({ domain, values }, domainIndex) => {
                      const value = values[categoryIndex];
                      const barHeight = (value / scaleMax) * plotHeight;
                      const x = clusterStart + domainIndex * (barWidth + gap);
                      const y = PADDING.top + plotHeight - barHeight;
                      return (
                        <rect
                          key={domain}
                          x={x}
                          y={y}
                          width={barWidth}
                          height={barHeight}
                          rx={2}
                          fill={BLUE_PALETTE[domainIndex % BLUE_PALETTE.length]}
                        >
                          <title>{`${domain} · ${CATEGORY_LABELS[category]}: ${value}`}</title>
                        </rect>
                      );
                    })}
                    <text x={groupCenter} y={HEIGHT - 32} textAnchor="middle" className="fill-lt-muted text-[11px]">
                      {labelLines.map((line, index) => (
                        <tspan key={line} x={groupCenter} dy={index === 0 ? 0 : 13}>{line}</tspan>
                      ))}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          {total === 0 && (
            <p className="mt-3 text-sm text-lt-muted">
              {incomplete
                ? "No hay hallazgos abiertos registrados, pero sin cobertura completa eso no confirma que no existan."
                : "No se encontraron hallazgos abiertos."}
            </p>
          )}
        </>
      )}
    </Card>
  );
}