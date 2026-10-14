"use client";

import { useId, useState, type FormEvent } from "react";
import { Plus, Radar } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Field, SELECT } from "@/components/ui/Field";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { Modal } from "@/components/ui/Modal";
import { SCAN_BLOCK_REASON_LABELS } from "@/config/labels";
import { getErrorMessage } from "@/services/errors";
import { requestScan } from "@/services/scanService";
import type { Domain } from "@/types";

interface ScanButtonProps {
  domains: Domain[];
  /** Dominio ya elegido (detalle de dominio): escanea sin preguntar cuál. */
  fixedDomain?: string;
  label?: string;
  variant?: "primary" | "secondary";
}

type Result = { tone: "success" | "error"; message: string };

/** «Nuevo escaneo» / «Escanear ahora». Solo se acepta con autorización vigente y TXT verificado. */
export function ScanButton({ domains, fixedDomain, label = "Nuevo escaneo", variant = "primary" }: ScanButtonProps) {
  const selectId = useId();
  const active = domains.filter((d) => d.status !== "removed");
  const [open, setOpen] = useState(false);
  const [fqdn, setFqdn] = useState(fixedDomain ?? active.find((d) => d.scan_eligibility.can_scan)?.fqdn ?? active[0]?.fqdn ?? "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const selected = active.find((d) => d.fqdn === fqdn);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!fqdn) return;
    setBusy(true);
    setResult(null);
    try {
      const response = await requestScan(fqdn);
      setResult(
        response.accepted
          ? { tone: "success", message: `Escaneo de ${fqdn} en cola. Verás los resultados en unos minutos.` }
          : { tone: "error", message: response.detail },
      );
    } catch (error) {
      setResult({ tone: "error", message: getErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const openModal = () => {
    setResult(null);
    setOpen(true);
    if (fixedDomain) void submit();
  };

  return (
    <>
      <ActionButton variant={variant} onClick={openModal}>
        {fixedDomain ? <Radar aria-hidden="true" className="h-4 w-4" /> : <Plus aria-hidden="true" className="h-4 w-4" />}
        {label}
      </ActionButton>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={fixedDomain ? `Escanear ${fixedDomain}` : "Nuevo escaneo"}
        description="Solo se escanean dominios con autorización vigente y registro TXT verificado. Solo fuentes públicas y pasivas."
      >
        <form onSubmit={submit} className="space-y-4">
          {!fixedDomain && (
            <Field label="Dominio" htmlFor={selectId}>
              <select id={selectId} value={fqdn} onChange={(e) => setFqdn(e.target.value)} className={SELECT}>
                {active.map((d) => (
                  <option key={d.fqdn} value={d.fqdn}>
                    {d.fqdn}
                    {d.scan_eligibility.can_scan ? "" : " (no disponible)"}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {selected && !selected.scan_eligibility.can_scan && !result && (
            <InlineAlert tone="warning">
              {selected.scan_eligibility.reasons.map((r) => SCAN_BLOCK_REASON_LABELS[r]).join(" · ")}
            </InlineAlert>
          )}
          {result && <InlineAlert tone={result.tone}>{result.message}</InlineAlert>}
          <div className="flex justify-end gap-2">
            <ActionButton variant="ghost" onClick={() => setOpen(false)}>
              Cerrar
            </ActionButton>
            {(!fixedDomain || result?.tone === "error") && (
              <ActionButton type="submit" loading={busy}>
                {fixedDomain ? "Reintentar" : "Escanear"}
              </ActionButton>
            )}
          </div>
        </form>
      </Modal>
    </>
  );
}
