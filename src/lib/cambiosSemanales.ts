// Cambios frente al escaneo anterior (#37, RC-73): activo nuevo, hallazgo nuevo y crecimiento del inventario de más
// de 20 % en la semana, con el weekly_changes de GET /domains/{fqdn}/score/history (cirdan/score/cambios.py).
// Sin imports con @/ de valores, así node --test lo carga.
import type { ScoreHistoryPoint, WeeklyChanges } from "@/types";

export type WeeklyChangeKind = "new_asset" | "new_finding" | "assets_growth";

export interface WeeklyChangeNote {
  kind: WeeklyChangeKind;
  text: string;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const percent = (value: number) => value.toLocaleString("es-MX", { maximumFractionDigits: 1 });

/** Una nota por alerta que la API marcó, en el orden del reto. Sin alertas (o null) da []. */
export function weeklyChangeNotes(changes: WeeklyChanges | null): WeeklyChangeNote[] {
  if (!changes) return [];
  const notes: WeeklyChangeNote[] = [];
  if (changes.alerts.new_asset) {
    notes.push({ kind: "new_asset", text: plural(changes.new_assets, "activo nuevo", "activos nuevos") });
  }
  if (changes.alerts.new_finding) {
    notes.push({ kind: "new_finding", text: plural(changes.new_findings, "hallazgo nuevo", "hallazgos nuevos") });
  }
  if (changes.alerts.assets_growth_over_20_percent && changes.assets_growth_percent !== null) {
    const counts = changes.assets_before !== null && changes.assets_now !== null
      ? ` (de ${changes.assets_before} a ${changes.assets_now})` : "";
    notes.push({ kind: "assets_growth", text: `Inventario +${percent(changes.assets_growth_percent)} % en la semana${counts}` });
  }
  return notes;
}

/** El último escaneo del histórico (no un recálculo), o null si no hay. Los puntos van del más viejo al más nuevo. */
export function latestScan(points: ScoreHistoryPoint[]): ScoreHistoryPoint | null {
  for (let i = points.length - 1; i >= 0; i -= 1) if (points[i]!.reason === "scan") return points[i]!;
  return null;
}
