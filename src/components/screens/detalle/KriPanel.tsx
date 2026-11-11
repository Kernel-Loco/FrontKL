import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { SEVERITY_TONE, SOLID_TONES, type Tone } from "@/components/ui/tones";
import { SEVERITY_LABELS } from "@/config/labels";
import { kriNote, kriView, type KriTone } from "@/lib/riesgo";
import type { Kri, SubcategoryScore } from "@/types";

/** Sin datos completos va en gris: nunca en el color de sin riesgo. */
const toneOf = (tone: KriTone): Tone => (tone === "clean" ? "green" : tone === "unknown" ? "gray" : SEVERITY_TONE[tone]);

/** Los 5 KRI encima de las 4 categorías (#114), con el color de su severidad más alta. */
export function KriPanel({ kris, subcategories, mapVersion }: { kris: Kri[]; subcategories: SubcategoryScore[]; mapVersion: number }) {
  return (
    <Card title="Indicadores clave de riesgo (KRI)" description={kriNote(subcategories, kris)} action={`Mapa v${mapVersion}`}>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {kris.map((kri) => {
          const view = kriView(kri);
          const tone = toneOf(view.tone);
          return (
            <li key={kri.kri} className="overflow-hidden rounded-lg border border-lt-border bg-lt-raised/40">
              <div aria-hidden="true" className={`h-1 ${SOLID_TONES[tone].bg}`} />
              <div className="space-y-2 p-4">
                <p className="text-sm font-medium text-lt-text">{kri.name}</p>
                <p className={`text-lg font-semibold tabular-nums ${SOLID_TONES[tone].text}`}>{view.value}</p>
                {kri.max_severity && <p className="text-xs text-lt-muted">Severidad más alta: {SEVERITY_LABELS[kri.max_severity]}</p>}
                {view.status && <Badge tone={kri.status === "partial" ? "amber" : "gray"}>{view.status}</Badge>}
                {view.warning && <p className="text-xs leading-relaxed text-lt-muted">{view.warning}</p>}
                {view.detail && <p className="break-words font-mono text-[11px] text-lt-faint">{view.detail}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
