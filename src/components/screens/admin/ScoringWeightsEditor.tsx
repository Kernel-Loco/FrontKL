"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/components/ui/ActionButton";
import { CHECKBOX, Field, INPUT } from "@/components/ui/Field";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { CATEGORY_LABELS } from "@/config/labels";
import { cantidad } from "@/lib/format";
import { updateScoringWeights } from "@/services/scoringService";
import { getErrorMessage } from "@/services/errors";
import type { Category, ScoringWeights } from "@/types";

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

type WeightValues = Record<Category, string>;
type ResultMessage = { tone: "success" | "error"; text: string };

function toValues(weights: Record<Category, number>): WeightValues {
  return {
    infrastructure: String(Number((weights.infrastructure * 100).toFixed(2))),
    digital_identity: String(Number((weights.digital_identity * 100).toFixed(2))),
    configuration: String(Number((weights.configuration * 100).toFixed(2))),
    data_leaks: String(Number((weights.data_leaks * 100).toFixed(2))),
  };
}

export function ScoringWeightsEditor({ initialWeights }: { initialWeights: ScoringWeights["category_weights"] }) {
  const router = useRouter();
  const [values, setValues] = useState(() => toValues(initialWeights));
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<ResultMessage | null>(null);

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
    if (!confirmed) {
      setMessage({ tone: "error", text: "Confirma que entiendes el efecto de publicar los nuevos pesos." });
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
      const result = await updateScoringWeights(categoryWeights);
      setValues(toValues(result.category_weights));
      setConfirmed(false);
      setMessage({
        tone: "success",
        text: result.unchanged
          ? `Los pesos no cambiaron; sigue activa la versión ${result.rule_set_version}.`
          : `Se activó la versión ${result.rule_set_version} y se recalculó el score de ${cantidad(result.recalculated_domains, "dominio")}.`,
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
      <label className="flex items-start gap-2.5 text-xs leading-relaxed text-lt-muted">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          className={`${CHECKBOX} mt-0.5`}
        />
        Confirmo que publicar los cambios crea una versión nueva y recalcula los scores de la organización.
      </label>
      {message && <InlineAlert tone={message.tone}>{message.text}</InlineAlert>}
      <ActionButton type="submit" loading={saving} disabled={!confirmed}>
        Guardar pesos y recalcular
      </ActionButton>
    </form>
  );
}
