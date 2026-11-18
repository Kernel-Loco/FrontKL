"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { CHECKBOX, Field, INPUT } from "@/components/ui/Field";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { BAND_TONE } from "@/components/ui/tones";
import { BAND_LABELS, CATEGORY_LABELS } from "@/config/labels";
import { errorDeCortes, mismosCortes, vistaPrevia } from "@/lib/bandas";
import { cantidad } from "@/lib/format";
import { updateScoringWeights } from "@/services/scoringService";
import { getErrorMessage } from "@/services/errors";
import type { BandCutoffs, Category, ScoringWeights } from "@/types";

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];
const CUTOFFS: { key: keyof BandCutoffs; label: string }[] = [
  { key: "medium", label: "El medio empieza en" },
  { key: "high", label: "El alto empieza en" },
  { key: "critical", label: "El crítico empieza en" },
];

type WeightValues = Record<Category, string>;
type CutoffValues = Record<keyof BandCutoffs, string>;
type ResultMessage = { tone: "success" | "error"; text: string };

function toValues(weights: Record<Category, number>): WeightValues {
  return {
    infrastructure: String(Number((weights.infrastructure * 100).toFixed(2))),
    digital_identity: String(Number((weights.digital_identity * 100).toFixed(2))),
    configuration: String(Number((weights.configuration * 100).toFixed(2))),
    data_leaks: String(Number((weights.data_leaks * 100).toFixed(2))),
  };
}

function toCutoffValues(c: BandCutoffs): CutoffValues {
  return { medium: String(c.medium), high: String(c.high), critical: String(c.critical) };
}

/** Los cortes como números, o `null` si alguno está vacío o no es un número entero. */
function parseCutoffs(values: CutoffValues): BandCutoffs | null {
  const parsed = { medium: Number(values.medium), high: Number(values.high), critical: Number(values.critical) };
  const enteros = CUTOFFS.every(({ key }) => /^\d+$/.test(values[key].trim()) && Number.isInteger(parsed[key]));
  return enteros ? parsed : null;
}

export function ScoringWeightsEditor({
  initialWeights,
  initialCutoffs,
  templateCutoffs,
}: {
  initialWeights: ScoringWeights["category_weights"];
  initialCutoffs: BandCutoffs;
  templateCutoffs: BandCutoffs;
}) {
  const router = useRouter();
  const [values, setValues] = useState(() => toValues(initialWeights));
  const [cutoffs, setCutoffs] = useState(() => toCutoffValues(initialCutoffs));
  // Los cortes guardados: con ellos se decide si el PUT manda band_cutoffs.
  const [savedCutoffs, setSavedCutoffs] = useState(initialCutoffs);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<ResultMessage | null>(null);

  const parsedCutoffs = parseCutoffs(cutoffs);
  const cutoffError = parsedCutoffs ? errorDeCortes(parsedCutoffs) : "Cada corte debe ser un número entero.";
  const preview = parsedCutoffs && !cutoffError ? vistaPrevia(parsedCutoffs) : null;
  const cutoffsChanged = parsedCutoffs !== null && !mismosCortes(parsedCutoffs, savedCutoffs);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    const parsed: Record<Category, number> = {
      infrastructure: 0,
      digital_identity: 0,
      configuration: 0,
      data_leaks: 0,
    };
    for (const category of CATEGORIES) {
      const percent = Number(values[category]);
      if (values[category].trim() === "" || !Number.isFinite(percent) || percent < 0 || percent > 100) {
        setMessage({ tone: "error", text: "Cada peso debe ser un número entre 0 % y 100 %." });
        return;
      }

      const hundredthsOfPercent = Math.round(percent * 100);
      if (Math.abs(percent * 100 - hundredthsOfPercent) > 1e-7) {
        setMessage({ tone: "error", text: "Usa como máximo dos decimales en cada porcentaje." });
        return;
      }
      parsed[category] = hundredthsOfPercent / 10_000;
    }

    const total = CATEGORIES.reduce((sum, category) => sum + (parsed[category] ?? 0), 0);
    if (Math.abs(total - 1) > 1e-9) {
      setMessage({ tone: "error", text: "Los cuatro pesos deben sumar exactamente 100 %." });
      return;
    }
    if (!parsedCutoffs || cutoffError) {
      setMessage({ tone: "error", text: cutoffError ?? "Cada corte debe ser un número entero." });
      return;
    }
    if (!confirmed) {
      setMessage({ tone: "error", text: "Confirma que entiendes el efecto de publicar los cambios." });
      return;
    }

    const categoryWeights: Record<Category, number> = {
      infrastructure: parsed.infrastructure,
      digital_identity: parsed.digital_identity,
      configuration: parsed.configuration,
      data_leaks: parsed.data_leaks,
    };

    setSaving(true);
    try {
      // Sin cambio en los cortes no se mandan: la API copia los de la versión anterior.
      const result = await updateScoringWeights(categoryWeights, cutoffsChanged ? parsedCutoffs : undefined);
      setValues(toValues(result.category_weights));
      setCutoffs(toCutoffValues(result.band_cutoffs));
      setSavedCutoffs(result.band_cutoffs);
      setConfirmed(false);
      const nuevos = `${result.band_cutoffs.medium}, ${result.band_cutoffs.high} y ${result.band_cutoffs.critical}`;
      setMessage({
        tone: "success",
        text: result.unchanged
          ? `Los pesos y los cortes no cambiaron; sigue activa la versión ${result.rule_set_version}.`
          : `Se activó la versión ${result.rule_set_version}, con los cortes ${nuevos}, y se recalculó el score de ${cantidad(result.recalculated_domains, "dominio")}.`,
      });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: getErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="mt-5 space-y-4 border-t border-lt-border pt-5">
      <p className="text-xs text-lt-muted">
        Ajusta la contribución relativa de cada categoría. La suma debe ser 100 %. Publicar cambios crea una versión nueva y recalcula los scores de la organización.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {CATEGORIES.map((category) => (
          <Field key={category} label={`${CATEGORY_LABELS[category]} (%)`} htmlFor={`weight-${category}`}>
            <input
              id={`weight-${category}`}
              type="number"
              min="0"
              max="100"
              step="0.01"
              inputMode="decimal"
              value={values[category]}
              onChange={(event) => {
                setValues((current) => ({ ...current, [category]: event.target.value }));
                setMessage(null);
              }}
              className={INPUT}
              aria-label={`${CATEGORY_LABELS[category]} en porcentaje`}
            />
          </Field>
        ))}
      </div>

      <fieldset className="space-y-3 border-t border-lt-border pt-4">
        <legend className="text-sm font-medium text-lt-text">Cortes de bandas</legend>
        <p className="text-xs text-lt-muted">
          Dónde empieza cada banda, en números enteros. El bajo empieza en 0, cada banda necesita al menos 10 puntos y el crítico termina en 100. Los de la
          plantilla son {templateCutoffs.medium}, {templateCutoffs.high} y {templateCutoffs.critical}. Las letras y el piso de los hallazgos críticos se mueven
          con los cortes.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {CUTOFFS.map(({ key, label }) => (
            <Field key={key} label={label} htmlFor={`cutoff-${key}`}>
              <input
                id={`cutoff-${key}`}
                type="number"
                min="10"
                max="91"
                step="1"
                inputMode="numeric"
                value={cutoffs[key]}
                onChange={(event) => {
                  setCutoffs((current) => ({ ...current, [key]: event.target.value }));
                  setMessage(null);
                }}
                className={INPUT}
                aria-invalid={cutoffError !== null}
              />
            </Field>
          ))}
        </div>
        {cutoffError ? (
          <p className="text-xs font-medium text-lt-red" role="alert">{cutoffError}</p>
        ) : (
          preview && (
            <div className="space-y-2 rounded-md bg-lt-raised p-3 text-xs text-lt-muted" aria-label="Vista previa de los cortes">
              <ul className="flex flex-wrap gap-2">
                {preview.bands.map((b) => (
                  <li key={b.band} className="flex items-center gap-1.5 tabular-nums">
                    <Badge tone={BAND_TONE[b.band]}>{BAND_LABELS[b.band]}</Badge>
                    {b.from} a {b.to}
                  </li>
                ))}
              </ul>
              <p className="tabular-nums">
                Letras: {preview.grades.map((g) => `${g.grade} ${g.from} a ${g.to}`).join(" · ")}
              </p>
              <p className="tabular-nums">
                Piso: con 1 hallazgo crítico vigente el score no baja de {preview.floor.one_critical}; con 2 o más, de {preview.floor.two_or_more_critical}.
              </p>
            </div>
          )
        )}
        {cutoffsChanged && !cutoffError && (
          <InlineAlert tone="warning">
            Cambiar los cortes recalcula el score, la banda y la letra de cada dominio de la organización, y cambia su plan de acción.
          </InlineAlert>
        )}
      </fieldset>

      <label className="flex items-start gap-2.5 text-xs leading-relaxed text-lt-muted">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          className={`${CHECKBOX} mt-0.5`}
        />
        Confirmo que publicar los cambios crea una versión nueva y recalcula los scores y el plan de acción de la organización.
      </label>
      {message && <InlineAlert tone={message.tone}>{message.text}</InlineAlert>}
      <ActionButton type="submit" loading={saving} disabled={!confirmed}>
        Guardar y recalcular
      </ActionButton>
    </form>
  );
}
