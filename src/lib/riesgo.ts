// Letra, subcategorías y KRI del score (#114, RC-232). La API da la letra, los estados y los conteos: aquí solo se
// decide cómo se muestran. Sin imports de valores, para que src/lib/riesgo.test.mjs lo cargue directo con Node.
import type { Category, Grade, Kri, KriStatus, Severity, SubcategoryScore } from "@/types";

export const KRI_STATUS_LABELS: Record<KriStatus, string> = {
  ok: "Cobertura completa",
  partial: "Cobertura parcial",
  no_coverage: "Sin cobertura",
  no_source_yet: "Sin fuente todavía",
};

/** Aviso de cobertura parcial que llevan el score y su letra. */
export const PARTIAL_GRADE_NOTE = "Cobertura parcial: el score y su letra pueden estar incompletos.";

/** Texto de la letra, con el mismo aviso que lleva el score cuando la cobertura es parcial. */
export function gradeText(grade: Grade, partial: boolean): string {
  return partial ? `Letra ${grade}, cobertura parcial` : `Letra ${grade}`;
}

/** Celda de score del PDF ejecutivo: score, letra, banda y, con cobertura parcial, el aviso. */
export function scoreCell(score: number | null, grade: Grade | null, bandLabel: string | null, partial: boolean): string {
  if (score === null) return "-";
  const main = `${score}${grade ? `, letra ${grade}` : ""}${bandLabel ? ` (${bandLabel})` : ""}`;
  return partial ? `${main}\n${PARTIAL_GRADE_NOTE}` : main;
}

/** Subcategorías de una categoría, en el orden en que las da la API. */
export function subcategoriesOf(category: Category, subcategories: SubcategoryScore[]): SubcategoryScore[] {
  return subcategories.filter((s) => s.category === category);
}

function joinSpanish(items: string[]): string {
  return items.length > 1 ? `${items.slice(0, -1).join(", ")} y ${items.at(-1)}` : (items[0] ?? "");
}

/** Lo que dice el detalle: los KRI no cubren todo el score, y qué subcategorías quedan fuera de ellos. */
export function kriNote(subcategories: SubcategoryScore[], kris: Kri[]): string {
  const inKri = new Set(kris.flatMap((k) => k.subcategories));
  const outside = [...new Set(subcategories.filter((s) => s.subcategory !== "other" && !inKri.has(s.subcategory)).map((s) => s.name))];
  const lower = outside.map((name) => name.charAt(0).toLowerCase() + name.slice(1));
  return outside.length > 0
    ? `Los KRI no cubren todo el score: ${joinSpanish(lower)} siguen contando en su categoría aunque no tengan KRI.`
    : "Los KRI no cubren todo el score: una regla sin KRI sigue contando en su categoría.";
}

/** clean: se revisó todo y no hay hallazgos. unknown: no se sabe; nunca se pinta como sin riesgo. */
export type KriTone = Severity | "clean" | "unknown";

export interface KriView {
  /** Estado que se muestra como etiqueta; null con cobertura completa. */
  status: string | null;
  value: string;
  tone: KriTone;
  warning: string | null;
  /** Qué fuentes o reglas faltaron, si la API lo dice. */
  detail: string | null;
}

const count = (n: number) => `${n} hallazgo${n === 1 ? "" : "s"}`;

function missing(kri: Kri): string | null {
  const parts = [
    kri.sources_failed.length ? `No respondió: ${kri.sources_failed.join(", ")}` : null,
    kri.sources_not_run.length ? `No corrió: ${kri.sources_not_run.join(", ")}` : null,
    kri.sources_partial.length ? `Revisó solo una parte: ${kri.sources_partial.join(", ")}` : null,
    kri.rules_without_coverage.length ? `Reglas sin cobertura: ${kri.rules_without_coverage.join(", ")}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(". ") : null;
}

/** Cómo se pinta un KRI. Sin cobertura, sin fuente o parcial nunca sale como sin riesgo ni en cero. */
export function kriView(kri: Kri): KriView {
  switch (kri.status) {
    case "no_coverage":
      return {
        status: KRI_STATUS_LABELS.no_coverage,
        value: "—",
        tone: "unknown",
        warning: "Alguna fuente no respondió o no se pudo revisar nada: no quiere decir que no haya riesgo.",
        detail: missing(kri),
      };
    case "no_source_yet":
      return {
        status: KRI_STATUS_LABELS.no_source_yet,
        value: "—",
        tone: "unknown",
        warning: "Todavía no hay una fuente que lo revise: no quiere decir que no haya riesgo.",
        detail: null,
      };
    case "partial":
      return {
        status: KRI_STATUS_LABELS.partial,
        value: kri.findings === null ? "—" : count(kri.findings),
        tone: kri.max_severity ?? "unknown",
        warning: "No se revisó todo: lo que no aparece aquí puede faltar por revisar.",
        detail: missing(kri),
      };
    case "ok":
      if (kri.findings === null) return { status: null, value: "—", tone: "unknown", warning: null, detail: null };
      return {
        status: null,
        value: kri.findings === 0 ? "Sin hallazgos" : count(kri.findings),
        tone: kri.max_severity ?? (kri.findings === 0 ? "clean" : "unknown"),
        warning: null,
        detail: null,
      };
  }
}
