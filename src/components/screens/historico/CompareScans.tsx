"use client";

import { useId, useState } from "react";
import { Card } from "@/components/ui/Card";
import { SELECT } from "@/components/ui/Field";
import { CATEGORY_LABELS } from "@/config/labels";
import { formatShortDate } from "@/lib/format";
import type { Category, ScoreHistoryPoint } from "@/types";
import { Delta } from "./Delta";

function reasonSuffix(p: ScoreHistoryPoint) {
  if (p.reason === "scan") return "";
  return p.reason === "correction" ? " · corrección" : " · recálculo";
}

export function CompareScans({ points }: { points: ScoreHistoryPoint[] }) {
  const fromId = useId();
  const toId = useId();
  const [from, setFrom] = useState(Math.max(0, points.length - 2));
  const [to, setTo] = useState(points.length - 1);
  const a = points[from]!;
  const b = points[to]!;
  // Una corrección cambia el número guardado, no la exposición: si hay una
  // entre las dos fechas, la diferencia no se pinta como subida o bajada.
  const withCorrection = points
    .slice(Math.min(from, to) + 1, Math.max(from, to) + 1)
    .some((p) => p.reason === "correction");

  return (
    <Card title="Comparar escaneos">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={fromId} className="mb-1.5 block text-xs font-medium text-lt-muted">
            Desde
          </label>
          <select id={fromId} value={from} onChange={(e) => setFrom(Number(e.target.value))} className={SELECT}>
            {points.map((p, i) => (
              <option key={p.score_id} value={i}>
                {formatShortDate(p.computed_at)}{reasonSuffix(p)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={toId} className="mb-1.5 block text-xs font-medium text-lt-muted">
            Hasta
          </label>
          <select id={toId} value={to} onChange={(e) => setTo(Number(e.target.value))} className={SELECT}>
            {points.map((p, i) => (
              <option key={p.score_id} value={i}>
                {formatShortDate(p.computed_at)}{reasonSuffix(p)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <ul className="mt-4 divide-y divide-lt-border">
        <li className="flex items-center justify-between py-3 text-sm">
          <span className="font-semibold text-lt-text">Riesgo global</span>
          <span className="flex items-center gap-2 tabular-nums text-lt-text">
            {a.score} → {b.score} {!withCorrection && <Delta value={b.score - a.score} />}
          </span>
        </li>
        {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
          <li key={c} className="flex items-center justify-between py-3 text-sm">
            <span className="text-lt-text">{CATEGORY_LABELS[c]}</span>
            <span className="flex items-center gap-2 tabular-nums text-lt-text">
              {a.categories[c]} → {b.categories[c]}{" "}
              {!withCorrection && <Delta value={b.categories[c] - a.categories[c]} />}
            </span>
          </li>
        ))}
      </ul>
      {withCorrection && (
        <p className="mt-2 text-xs text-lt-muted">
          Entre estas fechas hay una corrección del score guardado, así que la diferencia no es un cambio de exposición.
        </p>
      )}
    </Card>
  );
}
