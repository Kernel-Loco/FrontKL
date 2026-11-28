import { Scale } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, TableWrap, TR } from "@/components/ui/Card";
import { BAND_TONE } from "@/components/ui/tones";
import { BAND_LABELS, CATEGORY_LABELS, SEVERITY_LABELS } from "@/config/labels";
import { mismosCortes } from "@/lib/bandas";
import { formatDateTime } from "@/lib/format";
import type { Category, ScoringWeights } from "@/types";
import { ScoringWeightsEditor } from "./ScoringWeightsEditor";
import { tx } from "@/i18n/tx";

const TH = "px-3 py-3 text-left text-xs font-medium text-lt-muted first:pl-5 last:pr-5";
const TD = "px-3 py-3 align-middle text-sm text-lt-text first:pl-5 last:pr-5";
const PERCENT_FORMAT = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 });

/** Muestra el juego activo y permite crear una nueva versión de sus pesos (#32) y de sus cortes de bandas (RC-237). */
export function ScoringWeightsView({ weights }: { weights: ScoringWeights }) {
  const categories = Object.keys(CATEGORY_LABELS) as Category[];

  return (
    <div className="space-y-6">
      <Card
        title={tx("Juego de reglas activo")}
        icon={<Scale aria-hidden="true" className="h-4 w-4" />}
        action={<Badge tone="indigo">{tx("Versión")}{" "}{weights.rule_set_version}</Badge>}
      >
        <p className="text-sm text-lt-muted">
          {tx("Activo desde")}{" "}{formatDateTime(weights.activated_at)}
          {weights.validated_by ? tx(" · validado por {0}", weights.validated_by) : tx(" · sin validar")}{tx(". El score de cada dominio va de 0 a 100.")}</p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={tx("Peso de cada categoría")} description={tx("Cuánto aporta cada categoría al score total.")}>
          <ul className="space-y-3">
            {categories.map((category) => (
              <li key={category}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-lt-text">{CATEGORY_LABELS[category]}</span>
                  <span className="font-semibold tabular-nums text-lt-text">{PERCENT_FORMAT.format(weights.category_weights[category] * 100)} %</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-lt-raised" aria-hidden="true">
                  <div className="h-full rounded-full bg-lt-indigo" style={{ width: `${weights.category_weights[category] * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <ScoringWeightsEditor
            initialWeights={weights.category_weights}
            initialCutoffs={weights.band_cutoffs}
            templateCutoffs={weights.band_cutoffs_template}
            initialVersion={weights.rule_set_version}
          />
        </Card>

        <Card
          title={tx("Bandas de riesgo")}
          description={
            mismosCortes(weights.band_cutoffs, weights.band_cutoffs_template)
              ? tx("El nivel que corresponde a cada rango del score. Tu empresa usa los cortes de la plantilla.")
              : tx("El nivel que corresponde a cada rango del score. Tu empresa usa sus propios cortes; los de la plantilla son {0}, {1} y {2}.", weights.band_cutoffs_template.medium, weights.band_cutoffs_template.high, weights.band_cutoffs_template.critical)
          }
        >
          <ul className="divide-y divide-lt-border">
            {weights.bands.map((b) => (
              <li key={b.band} className="flex items-center justify-between py-2.5 text-sm">
                <Badge tone={BAND_TONE[b.band]}>
                  {BAND_LABELS[b.band]}
                </Badge>
                <span className="tabular-nums text-lt-muted">
                  {tx("{0} a {1}", b.from, b.to)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-lt-muted">
            {tx("Piso: con 1 hallazgo crítico vigente el score no baja de")}{" "}{weights.floor.one_critical}{tx("; con 2 o más, de")}{" "}{weights.floor.two_or_more_critical}{tx(". Umbral de alerta por defecto:")}{" "}{weights.alert_threshold_default}.
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-lt-muted" aria-label={tx("Letras del score")}>
            {weights.grades.map((g) => (
              <li key={g.grade} className="tabular-nums">
                <span className="font-semibold text-lt-text">{g.grade}</span> {tx("{0} a {1}", g.from, g.to)}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title={tx("Reglas")} description={tx("Peso y penalización máxima de cada regla.")} action={tx("{0} reglas", weights.rules.length)} padded={false}>
        <TableWrap>
          <table className="w-full min-w-[560px]">
            <thead>
              <tr>
                <th scope="col" className={TH}>{tx("Regla")}</th>
                <th scope="col" className={TH}>{tx("Categoría")}</th>
                <th scope="col" className={TH}>{tx("Severidad base")}</th>
                <th scope="col" className={`${TH} text-right`}>{tx("Peso")}</th>
                <th scope="col" className={`${TH} text-right`}>{tx("Penalización máx.")}</th>
              </tr>
            </thead>
            <tbody>
              {weights.rules.map((rule) => (
                <tr key={rule.code} className={TR}>
                  <td className={`${TD} max-w-sm text-[13px]`}>
                    {rule.title ? (
                      <>
                        <span className="text-lt-text">{rule.title}</span>
                        <span className="block tabular-nums text-[11px] text-lt-faint">{rule.code}</span>
                        {rule.meaning && <span className="block text-xs leading-relaxed text-lt-muted">{rule.meaning}</span>}
                      </>
                    ) : (
                      <span className="tabular-nums">{rule.code}</span>
                    )}
                  </td>
                  <td className={`${TD} text-lt-muted`}>{CATEGORY_LABELS[rule.category]}</td>
                  <td className={TD}>{SEVERITY_LABELS[rule.base_severity]}</td>
                  <td className={`${TD} text-right tabular-nums`}>{rule.weight}</td>
                  <td className={`${TD} text-right tabular-nums`}>{rule.max_penalty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Card>
    </div>
  );
}
