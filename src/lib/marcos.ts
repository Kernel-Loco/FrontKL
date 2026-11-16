// Marcos de referencia de la regla de un hallazgo en el panel de explicación (HX15, RC-131). La API entrega el
// número, el nombre breve en español y el enlace; el texto de CIS y de MITRE no se copia. La atribución sale de NOTICE
// de BackKL.
import type { Frameworks } from "@/types";

export interface MarcoVisible {
  marco: string;
  texto: string;
  url: string | null;
}

export const MARCOS_ATRIBUCION =
  "MITRE ATT&CK® © The MITRE Corporation, reproducido con su permiso; MITRE ATT&CK y ATT&CK son marcas registradas de " +
  "The MITRE Corporation. CIS Controls v8.1 © Center for Internet Security, Inc., bajo CC BY-NC-ND 4.0. ISO/IEC " +
  "27001:2022 solo se cita por número de control.";

const url = (u: string | null | undefined) => (u && /^https:\/\//.test(u) ? u : null);

/** Las tres filas del panel, o ninguna si el hallazgo no trae marcos (el simulado). */
export function marcosDelHallazgo(f: Frameworks | undefined): MarcoVisible[] {
  if (!f) return [];
  const a = f.mitre_attack;
  return [
    {
      marco: `MITRE ATT&CK ${a.version}`,
      texto: a.technique_id ? `${a.technique_id} ${a.technique_name ?? ""}`.trim() : `Sin técnica: ${a.unmapped_reason ?? "no aplica"}`,
      url: a.technique_id ? url(a.source_url) : null,
    },
    {
      marco: "ISO/IEC 27001:2022",
      texto: `${f.iso_27001_2022.control_id} ${f.iso_27001_2022.control_name}`.trim(),
      url: url(f.iso_27001_2022.source_url),
    },
    {
      marco: `CIS Controls ${f.cis_controls_v8_1.version}`,
      texto: `${f.cis_controls_v8_1.safeguard_id} ${f.cis_controls_v8_1.safeguard_name}`.trim(),
      url: url(f.cis_controls_v8_1.source_url),
    },
  ];
}
