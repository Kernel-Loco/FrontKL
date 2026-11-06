import { Scale } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, TableWrap, TR } from "@/components/ui/Card";
import { BAND_LABELS, CATEGORY_LABELS, SEVERITY_LABELS } from "@/config/labels";
import { formatDateTime, formatPercent } from "@/lib/format";
import type { Category, ScoringWeights } from "@/types";

const TH = "px-3 py-3 text-left text-xs font-medium text-lt-muted first:pl-5 last:pr-5";
const TD = "px-3 py-3 align-middle text-sm text-lt-text first:pl-5 last:pr-5";

/** Pesos, bandas, piso y reglas del juego activo (solo lectura; cambiarlo crea un juego nuevo, #32). */
export function ScoringWeightsView({ weights }: { weights: ScoringWeights }) {
  const categories = Object.keys(CATEGORY_LABELS) as Category[];

  return (
    <div className="space-y-6">
      <Card
        title="Juego de reglas activo"
        icon={<Scale aria-hidden="true" className="h-4 w-4" />}
        action={<Badge tone="indigo">Versión {weights.rule_set_version}</Badge>}
      >
        <p className="text-sm text-lt-muted">
          Activo desde {formatDateTime(weights.activated_at)}
          {weights.validated_by ? ` · validado por ${weights.validated_by}` : " · sin validar"}. El score de cada dominio va de 0 a 100.
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Peso de cada categoría" description="Cuánto aporta cada categoría al score total.">
          <ul className="space-y-3">
            {categories.map((category) => (
              <li key={category}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-lt-text">{CATEGORY_LABELS[category]}</span>
                  <span className="font-semibold tabular-nums text-lt-text">{formatPercent(weights.category_weights[category])}</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-lt-raised" aria-hidden="true">
                  <div className="h-full rounded-full bg-lt-indigo" style={{ width: `${weights.category_weights[category] * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Bandas de riesgo" description="El nivel que corresponde a cada rango del score.">
          <ul className="divide-y divide-lt-border">
            {weights.bands.map((b) => (
              <li key={b.band} className="flex items-center justify-between py-2.5 text-sm">
                <Badge tone={b.band === "critical" ? "red" : b.band === "high" ? "orange" : b.band === "medium" ? "amber" : "green"}>
                  {BAND_LABELS[b.band]}
                </Badge>
                <span className="tabular-nums text-lt-muted">
                  {b.from} a {b.to}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-lt-muted">
            Piso: con 1 hallazgo crítico vigente el score no baja de {weights.floor.one_critical}; con 2 o más, de {weights.floor.two_or_more_critical}. Umbral de
            alerta por defecto: {weights.alert_threshold_default}.
          </p>
        </Card>
      </div>

      <Card title="Reglas" description="Peso y penalización máxima de cada regla." action={`${weights.rules.length} reglas`} padded={false}>
        <TableWrap>
          <table className="w-full min-w-[560px]">
            <thead>
              <tr>
                <th scope="col" className={TH}>Regla</th>
                <th scope="col" className={TH}>Categoría</th>
                <th scope="col" className={TH}>Severidad base</th>
                <th scope="col" className={`${TH} text-right`}>Peso</th>
                <th scope="col" className={`${TH} text-right`}>Penalización máx.</th>
              </tr>
            </thead>
            <tbody>
              {weights.rules.map((rule) => (
                <tr key={rule.code} className={TR}>
                  <td className={`${TD} font-mono text-[13px]`}>{rule.code}</td>
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
