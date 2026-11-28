// Frases de la explicación SHAP del hallazgo (#35, RC-71). El SHAP que guarda BackKL es el de la clase predicha
// (cirdan/ml/inferencia.py, valores[i, indices, clase_index]): un aporte positivo empuja hacia esa clase (alta,
// media o baja), no "aumenta el riesgo". En un hallazgo de severidad baja, un aporte positivo lo acerca a baja.
// Sin imports de valores, para que src/lib/shap.test.mjs lo cargue directo con Node.
import type { Caracteristicas, Severity } from "@/types";
import { tx, localized } from "@/i18n/tx";

export const SHAP_LABELS: Record<string, string> = localized({
  tipo: "Tipo de hallazgo",
  antiguedad_dias: "Antigüedad",
  exposicion: "Exposición",
  sensibilidad: "Sensibilidad",
});

const CLASE: Partial<Record<Severity, string>> = { high: "alta", medium: "media", low: "baja" };

/** Nombre de la clase que predijo el modelo ('severidad alta'), o una forma genérica si la API no la manda. */
export function predictedClassText(prediction: Severity | null | undefined): string {
  const clase = prediction ? CLASE[prediction] : undefined;
  return clase ? tx("severidad {0}", clase) : tx("la severidad que predijo el modelo");
}

/** Un aporte de 0 o más acerca a la clase predicha. La frase, el signo y el color usan esta misma regla. */
export function shapPushesToward(contribution: number): boolean {
  return contribution >= 0;
}

/** Cómo mueve un aporte SHAP la predicción: hacia la clase predicha o lejos de ella. */
export function shapDirection(contribution: number, prediction: Severity | null | undefined): string {
  const clase = predictedClassText(prediction);
  return shapPushesToward(contribution) ? tx("acerca la predicción a {0}", clase) : tx("aleja la predicción de {0}", clase);
}

/** Aporte con signo y dos decimales para «Ver detalle SHAP»: 0 sale '+0.00' y -0.003 sale '−0.00', como su frase. */
export function shapDisplay(contribution: number): string {
  return `${shapPushesToward(contribution) ? "+" : "−"}${Math.abs(contribution).toFixed(2)}`;
}

/**
 * Colores del detalle SHAP. No son los de severidad (SEVERITY_TONE de tones.ts: naranja es alta y azul es baja),
 * porque el signo no dice más o menos riesgo: dice hacia la clase predicha o lejos de ella. En un hallazgo predicho
 * baja, el factor que lo acerca a baja salía naranja.
 */
export const SHAP_TONE = {
  toward: { text: "text-lt-indigo-soft", bar: "bg-lt-indigo" },
  away: { text: "text-lt-muted", bar: "bg-lt-muted" },
} as const;

export function shapTone(contribution: number): { text: string; bar: string } {
  return shapPushesToward(contribution) ? SHAP_TONE.toward : SHAP_TONE.away;
}

/** Una frase por característica para «Lo que más influyó». */
export function shapPhrase(
  feature: string,
  value: string | number,
  characteristics: Caracteristicas,
  contribution: number,
  prediction: Severity | null | undefined,
): string {
  const direction = shapDirection(contribution, prediction);
  const label = SHAP_LABELS[feature] ?? feature.replace(/_/g, " ");

  switch (feature) {
    case "tipo":
      return tx("El tipo de hallazgo ({0}) {1}.", characteristics.tipo.replace(/_/g, " "), direction);
    case "antiguedad_dias": {
      const days = Number(value);
      const age = Number.isFinite(days) ? `${days} ${days === 1 ? tx("día") : tx("días")}` : String(value);
      return tx("La exposición lleva {0}; este factor {1}.", age, direction);
    }
    case "exposicion":
      return characteristics.exposicion === "directa"
        ? tx("El activo responde directamente desde internet; esto {0}.", direction)
        : tx("El dato está disponible públicamente; esto {0}.", direction);
    case "sensibilidad":
      return tx("La información expuesta tiene sensibilidad {0}; esto {1}.", characteristics.sensibilidad, direction);
    default:
      return `${label} (${String(value)}) ${direction}.`;
  }
}

/** Nota bajo el detalle SHAP: qué significa el signo. */
export function shapLegend(prediction: Severity | null | undefined): string {
  const clase = predictedClassText(prediction);
  return tx("Positivo: acerca la predicción a {0}. Negativo: la aleja.", clase);
}
