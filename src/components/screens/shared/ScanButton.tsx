"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Radar } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Field, SELECT } from "@/components/ui/Field";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { Modal } from "@/components/ui/Modal";
import { SCAN_BLOCK_REASON_LABELS } from "@/config/labels";
import { getErrorMessage } from "@/services/errors";
import { getScan, isScanFinished, requestScan, type ScanProgress } from "@/services/scanService";
import type { Domain } from "@/types";

interface ScanButtonProps {
  domains: Domain[];
  /** Dominio ya elegido (detalle de dominio): escanea sin preguntar cuál. */
  fixedDomain?: string;
  label?: string;
  variant?: "primary" | "secondary";
}

type Result = { tone: "info" | "success" | "warning" | "error"; message: string };

const POLL_MS = 3000;
// El orquestador da por caído un escaneo a los 30 min sin marca de vida (#22): no se sigue más que eso.
const POLL_LIMIT_MS = 35 * 60 * 1000;

/** Mensaje del escaneo mientras corre y al terminar. */
function progressResult(scan: ScanProgress): Result {
  if (!isScanFinished(scan.status)) {
    const done = scan.sources.filter((s) => s.status === "succeeded" || s.status === "failed").length;
    const sources = scan.sources.length ? ` (${done} de ${scan.sources.length} fuentes listas)` : "";
    return { tone: "info", message: `Escaneando ${scan.domain}${sources}…` };
  }
  const stats = scan.stats;
  const found = stats ? ` ${stats.findings} hallazgos y ${stats.assets} activos.` : "";
  if (scan.status === "failed") return { tone: "error", message: `El escaneo de ${scan.domain} falló: ninguna fuente respondió.` };
  if (scan.status === "partial") {
    return { tone: "warning", message: `Escaneo de ${scan.domain} terminado con cobertura parcial.${found} Los datos ya están al día.` };
  }
  return { tone: "success", message: `Escaneo de ${scan.domain} terminado.${found} Los datos ya están al día.` };
}

/** «Nuevo escaneo» / «Escanear ahora». Solo se acepta con autorización vigente y TXT verificado. */
export function ScanButton({ domains, fixedDomain, label = "Nuevo escaneo", variant = "primary" }: ScanButtonProps) {
  const selectId = useId();
  const active = domains.filter((d) => d.status !== "removed");
  const [open, setOpen] = useState(false);
  const [fqdn, setFqdn] = useState(fixedDomain ?? active.find((d) => d.scan_eligibility.can_scan)?.fqdn ?? active[0]?.fqdn ?? "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const router = useRouter();
  const selected = active.find((d) => d.fqdn === fqdn);

  // Sigue el escaneo aceptado hasta que termine y entonces vuelve a pedir los datos de la página.
  useEffect(() => {
    if (!scanId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const startedAt = Date.now();
    const poll = async () => {
      try {
        const scan = await getScan(scanId);
        if (stopped) return;
        setResult(progressResult(scan));
        if (isScanFinished(scan.status)) {
          setScanId(null);
          router.refresh();
          return;
        }
      } catch {
        // Un fallo de red suelto no corta el seguimiento: se vuelve a intentar en la siguiente vuelta.
      }
      if (Date.now() - startedAt > POLL_LIMIT_MS) {
        setResult({ tone: "warning", message: "El escaneo sigue en curso. Revisa los resultados más tarde." });
        setScanId(null);
        return;
      }
      timer = setTimeout(poll, POLL_MS);
    };
    timer = setTimeout(poll, POLL_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [scanId, router]);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!fqdn) return;
    setBusy(true);
    setResult(null);
    try {
      const response = await requestScan(fqdn);
      if (response.accepted) {
        setResult({ tone: "info", message: `Escaneando ${fqdn}…` });
        setScanId(response.scan.id);
      } else {
        setResult({ tone: "error", message: response.detail });
      }
    } catch (error) {
      setResult({ tone: "error", message: getErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const openModal = () => {
    setOpen(true);
    if (scanId) return; // ya hay uno en curso: el modal muestra su avance
    setResult(null);
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
              <ActionButton type="submit" loading={busy || Boolean(scanId)}>
                {fixedDomain ? "Reintentar" : "Escanear"}
              </ActionButton>
            )}
          </div>
        </form>
      </Modal>
    </>
  );
}
