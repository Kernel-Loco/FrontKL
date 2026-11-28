"use client";

import { useState } from "react";
import { Radar } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { COVERAGE_SOURCE_LABELS } from "@/lib/cobertura";
import { formatDateTime } from "@/lib/format";
import { getErrorMessage } from "@/services/errors";
import { setSourceEnabled } from "@/services/sourcesService";
import type { SourceSetting } from "@/types";
import { tx, localized } from "@/i18n/tx";

/** Nombre de cada fuente en pantalla. Las que no están aquí van con su código. */
const SOURCE_NAMES: Record<string, string> = localized({
  ...COVERAGE_SOURCE_LABELS,
  identity: "Identidad pública",
  censys: "Censys",
  nvd: "NVD (vulnerabilidades)",
  first_epss: "EPSS de FIRST",
  cisa_kev: "KEV de CISA",
});

/** El aviso que pide el Hecho cuando de RC-235, siempre a la vista y otra vez antes de apagar. */
export const AVISO_COBERTURA =
  "Apagar una fuente reduce la cobertura: los escaneos siguientes salen con cobertura parcial y su score deja de ser comparable con los anteriores.";

const nombre = (code: string) => (Object.hasOwn(SOURCE_NAMES, code) ? SOURCE_NAMES[code] : code);

/** Encendida para la empresa: no la apagó. Lo de la plataforma va aparte. */
const encendidaEnEmpresa = (s: SourceSetting) => s.org_enabled !== false;

function quien(s: SourceSetting) {
  if (!s.changed_at) return null;
  const por = s.changed_by_platform ? tx("LowTide") : s.changed_by;
  return tx("Cambiada {0}", formatDateTime(s.changed_at)) + (por ? tx(" por {0}", por) : "");
}

export function SourcesManager({ initial }: { initial: SourceSetting[] }) {
  const [items, setItems] = useState(initial);
  const [togglingCode, setTogglingCode] = useState<string | null>(null);
  const [pendingOff, setPendingOff] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const osint = items.filter((s) => s.kind === "osint");
  const intel = items.filter((s) => s.kind === "intel");

  const apply = async (code: string, enabled: boolean) => {
    setTogglingCode(code);
    setError(null);
    try {
      const updated = await setSourceEnabled(code, enabled);
      setItems((current) => current.map((s) => (s.code === updated.code ? updated : s)));
      setPendingOff(null);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setTogglingCode(null);
    }
  };

  const onToggle = (s: SourceSetting) => {
    if (encendidaEnEmpresa(s)) setPendingOff(s.code);  // apagar pide confirmar con el aviso
    else void apply(s.code, true);
  };

  return (
    <div className="space-y-6">
      <InlineAlert tone="warning">{tx(AVISO_COBERTURA)}</InlineAlert>
      {error && <InlineAlert tone="error">{error}</InlineAlert>}

      <Card
        title={tx("Fuentes de los escaneos")}
        description={tx("Tu empresa solo puede apagar fuentes. Una fuente que LowTide tiene apagada no se enciende desde aquí.")}
        icon={<Radar aria-hidden="true" className="h-4 w-4" />}
        action={tx("{0} de {1} corren", osint.filter((s) => s.effective_enabled).length, osint.length)}
      >
        <ul className="-my-3 divide-y divide-lt-border">
          {osint.map((s) => {
            const on = encendidaEnEmpresa(s);
            const cambio = quien(s);
            return (
              <li key={s.code} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-lt-text">
                      {nombre(s.code)}
                      {!s.global_enabled && <Badge tone="gray">{tx("Apagada por LowTide")}</Badge>}
                      {s.org_enabled === false && <Badge tone="amber">{tx("Apagada por tu empresa")}</Badge>}
                      {s.effective_enabled && <Badge tone="green">{tx("Corre")}</Badge>}
                    </p>
                    <p className="mt-1 tabular-nums text-[11px] text-lt-muted">{s.code}</p>
                    {cambio && <p className="mt-1 text-[11px] text-lt-muted">{cambio}</p>}
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={tx("{0} {1} para tu empresa", on ? tx("Apagar") : tx("Volver a encender"), nombre(s.code))}
                    disabled={!s.can_change || togglingCode === s.code}
                    onClick={() => onToggle(s)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${on ? "bg-lt-indigo" : "bg-lt-raised ring-1 ring-lt-border"}`}
                  >
                    <span aria-hidden="true" className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </div>
                {pendingOff === s.code && (
                  <InlineAlert tone="warning" className="mt-3">
                    <p>{tx("¿Apagar {0} para tu empresa?", nombre(s.code))} {tx(AVISO_COBERTURA)}</p>
                    <div className="mt-2 flex gap-2">
                      <ActionButton variant="danger" size="sm" loading={togglingCode === s.code} onClick={() => apply(s.code, false)}>
                        {tx("Apagar")}</ActionButton>
                      <ActionButton variant="secondary" size="sm" disabled={togglingCode === s.code} onClick={() => setPendingOff(null)}>
                        {tx("Cancelar")}</ActionButton>
                    </div>
                  </InlineAlert>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      {intel.length > 0 && (
        <Card title={tx("Inteligencia de la plataforma")} description={tx("Las consulta LowTide para toda la plataforma. No se apagan por empresa.")}>
          <ul className="-my-3 divide-y divide-lt-border">
            {intel.map((s) => (
              <li key={s.code} className="flex items-center justify-between gap-3 py-3 text-sm text-lt-text">
                {nombre(s.code)}
                <Badge tone={s.global_enabled ? "green" : "gray"}>{s.global_enabled ? tx("Activa") : tx("Apagada")}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
