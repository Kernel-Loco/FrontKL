import { ProgressBar } from "@/components/ui/ProgressBar";
import { BAND_TONE } from "@/components/ui/tones";
import { CATEGORY_LABELS } from "@/config/labels";
import { KRI_STATUS_LABELS, subcategoriesOf, subcategoryCoverage } from "@/lib/riesgo";
import type { CategoryScore, Kri, SubcategoryScore } from "@/types";

const POINTS = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });

/**
 * Las 4 categorías y, dentro de cada una, sus hallazgos vigentes por subcategoría (#114). Una subcategoría sin
 * hallazgos cuyo KRI no tuvo cobertura completa dice su estado, no un cero.
 */
export function CategoryBars({ categories, subcategories = [], kris = [] }: { categories: CategoryScore[]; subcategories?: SubcategoryScore[]; kris?: Kri[] }) {
  return (
    <ul className="space-y-5">
      {categories.map((c) => {
        const subs = subcategoriesOf(c.category, subcategories);
        return (
          <li key={c.category}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="text-lt-text">{CATEGORY_LABELS[c.category]}</span>
              <span className="text-xs text-lt-muted">
                peso {Math.round(c.weight * 100)} % · <strong className="font-semibold text-lt-text">{c.score}</strong>
              </span>
            </div>
            <ProgressBar value={c.score} tone={BAND_TONE[c.band]} label={`${CATEGORY_LABELS[c.category]}: ${c.score} de 100`} className="h-2" />
            {subs.length > 0 && (
              <ul aria-label={`Subcategorías de ${CATEGORY_LABELS[c.category]}`} className="mt-2.5 space-y-1 border-l border-lt-border pl-3">
                {subs.map((s) => {
                  const coverage = subcategoryCoverage(s.subcategory, kris);
                  const incomplete = coverage !== null && coverage !== "ok";
                  const findings = `${s.findings} hallazgo${s.findings === 1 ? "" : "s"} · ${POINTS.format(s.penalty)} pts`;
                  return (
                    <li
                      key={s.subcategory}
                      className={`flex items-baseline justify-between gap-3 text-xs ${s.findings > 0 ? "text-lt-text" : incomplete ? "text-lt-muted" : "text-lt-faint"}`}
                    >
                      <span>{s.name}</span>
                      <span className="whitespace-nowrap tabular-nums">
                        {incomplete && s.findings === 0 ? (
                          <span className={coverage === "partial" ? "text-lt-amber" : undefined}>{KRI_STATUS_LABELS[coverage]}</span>
                        ) : (
                          <>
                            {findings}
                            {incomplete && <span className="text-lt-amber"> · {KRI_STATUS_LABELS[coverage].toLowerCase()}</span>}
                          </>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
