// Frases de la explicación SHAP del hallazgo (#35, RC-71). El SHAP que guarda BackKL es el de la clase predicha
// (cirdan/ml/inferencia.py, valores[i, indices, clase_index]): un aporte positivo empuja hacia esa clase (alta,
// media o baja), no "aumenta el riesgo". En un hallazgo de severidad baja, un aporte positivo lo acerca a baja.
// Sin imports de valores, para que src/lib/shap.test.mjs lo cargue directo con Node.
import type { Caracteristicas, Severity } from "@/types";

export const SHAP_LABELS: Record<string, string> = {
  tipo: "Tipo de hallazgo",
  antiguedad_dias: "Antigüedad",
  exposicion: "Exposición",
  sensibilidad: "Sensibilidad",
};

const CLASE: Partial<Record<Severity, string>> = { high: "alta", medium: "media", low: "baja" };

/** Nombre de la clase que predijo el modelo ('severidad alta'), o una forma genérica si la API no la manda. */
export function predictedClassText(prediction: Severity | null | undefined): string {
  const clase = prediction ? CLASE[prediction] : undefined;
  return clase ? `severidad ${clase}` : "la severidad que predijo el modelo";
}

/** Cómo mueve un aporte SHAP la predicción: hacia la clase predicha o lejos de ella. */
export function shapDirection(contribution: number, prediction: Severity | null | undefined): string {
  const clase = predictedClassText(prediction);
  return contribution >= 0 ? `acerca la predicción a ${clase}` : `aleja la predicción de ${clase}`;
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
      return `El tipo de hallazgo (${characteristics.tipo.replace(/_/g, " ")}) ${direction}.`;
    case "antiguedad_dias": {
      const days = Number(value);
      const age = Number.isFinite(days) ? `${days} ${days === 1 ? "día" : "días"}` : String(value);
      return `La exposición lleva ${age}; este factor ${direction}.`;
    }
    case "exposicion":
      return characteristics.exposicion === "directa"
        ? `El activo responde directamente desde internet; esto ${direction}.`
        : `El dato está disponible públicamente; esto ${direction}.`;
    case "sensibilidad":
      return `La información expuesta tiene sensibilidad ${characteristics.sensibilidad}; esto ${direction}.`;
    default:
      return `${label} (${String(value)}) ${direction}.`;
  }
}

/** Nota bajo el detalle SHAP: qué significa el signo. */
export function shapLegend(prediction: Severity | null | undefined): string {
  const clase = predictedClassText(prediction);
  return `Positivo: acerca la predicción a ${clase}. Negativo: la aleja.`;
}
