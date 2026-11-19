import { coverageGroups } from "@/lib/cobertura";
import type { CoverageGap } from "@/types";

/** Qué códigos no revisó el último escaneo y por qué, dentro de la franja de cobertura parcial (RC-229). */
export function CoverageGapsList({ gaps }: { gaps: CoverageGap[] | undefined }) {
  const groups = coverageGroups(gaps ?? []);
  if (groups.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1">
      {groups.map((group) => (
        <li key={group.reason}>
          <span className="font-semibold">{group.label}:</span>{" "}
          {group.sources.map((s, index) => (
            <span key={s.source ?? "sin-fuente"}>
              {index > 0 && "; "}
              {s.name} (<span className="font-mono text-[11px]">{s.codes.join(", ")}</span>)
            </span>
          ))}
        </li>
      ))}
    </ul>
  );
}
