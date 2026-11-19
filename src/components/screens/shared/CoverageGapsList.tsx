import { coverageGroups } from "@/lib/cobertura";
import type { CoverageGap } from "@/types";

/**
 * Qué códigos no revisó el último escaneo y por qué, dentro de la franja de cobertura parcial (RC-229). Trae su
 * encabezado: sin lista (una API de antes) o con la lista vacía (parcial solo por repos o IP) lo dice en vez de dejarlo
 * a medias.
 */
export function CoverageGapsList({ gaps }: { gaps: CoverageGap[] | undefined }) {
  const groups = coverageGroups(gaps ?? []);
  if (groups.length === 0) {
    return (
      <p className="mt-2">
        {gaps === undefined
          ? "Esta versión de la API no dice qué reglas quedaron sin revisar."
          : "Todas las reglas se revisaron, pero alguna fuente revisó solo una parte de sus repos o IP."}
      </p>
    );
  }
  return (
    <>
      <p className="mt-2">Reglas sin revisar en el último escaneo:</p>
      <ul className="mt-1 space-y-1">
        {groups.map((group) => (
          <li key={group.reason}>
            <span className="font-semibold">{group.label}:</span>{" "}
            {group.sources.map((s, index) => (
              <span key={`${s.source ?? "sin-fuente"}-${s.name}`}>
                {index > 0 && "; "}
                {s.name} (<span className="font-mono text-[11px]">{s.codes.join(", ")}</span>)
              </span>
            ))}
          </li>
        ))}
      </ul>
    </>
  );
}
