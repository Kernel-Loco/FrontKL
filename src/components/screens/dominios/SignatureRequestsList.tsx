"use client";

import { useState } from "react";
import { FileSignature, RefreshCw } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { INPUT } from "@/components/ui/Field";
import type { Tone } from "@/components/ui/tones";
import { formatDate, formatRelative } from "@/lib/format";
import { acceptSignatureRequest, cancelSignatureRequest, refreshSignatureRequest } from "@/services/domainService";
import type { Domain, SignatureRequest, SignatureRequestList, SignatureRequestStatus, TxtVerification } from "@/types";
import { signatureError } from "./RegisterDomainForm";
import { tx, localized } from "@/i18n/tx";

const STATUS: Record<SignatureRequestStatus, { label: string; tone: Tone }> = localized({
  creating: { label: "Mandando a Mifiel", tone: "gray" },
  sent: { label: "Esperando firma", tone: "amber" },
  signed: { label: "Firmada, falta confirmar", tone: "blue" },
  accepted: { label: "Confirmada", tone: "green" },
  rejected: { label: "Rechazada", tone: "red" },
  cancelled: { label: "Cancelada", tone: "gray" },
  expired: { label: "Venció sin firma", tone: "orange" },
  failed: { label: "No se pudo mandar", tone: "red" },
});

interface SignatureRequestsListProps {
  items: SignatureRequest[];
  mode: SignatureRequestList["mode"];
  onChange: (item: SignatureRequest) => void;
  onAccepted: (domain: Domain, txt: TxtVerification) => void;
}

/** Cartas mandadas a firmar con Mifiel (RC-211, camino B). Cada consulta a Mifiel la pide el Admin con un clic. */
export function SignatureRequestsList({ items, mode, onChange, onAccepted }: SignatureRequestsListProps) {
  const [working, setWorking] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const run = async (id: string, action: () => Promise<void>) => {
    setWorking(id);
    setMessage(null);
    try {
      await action();
    } catch (error) {
      setMessage(signatureError(error));
    } finally {
      setWorking(null);
    }
  };

  const refresh = (item: SignatureRequest) =>
    run(item.id, async () => {
      const next = await refreshSignatureRequest(item.id);
      onChange(next);
      setMessage(
        next.last_error
          ? `${next.fqdn}: ${next.last_error}`
          : `${next.fqdn}: ${STATUS[next.status].label.toLowerCase()}.`,
      );
    });

  const cancel = (item: SignatureRequest) =>
    run(item.id, async () => {
      const next = await cancelSignatureRequest(item.id);
      onChange(next);
      setMessage(next.last_error ? `${next.fqdn}: ${next.last_error}` : tx("{0}: carta cancelada.", next.fqdn));
    });

  const accept = (item: SignatureRequest) =>
    run(item.id, async () => {
      const { domain, txt } = await acceptSignatureRequest(item.id, typed.trim());
      onChange({ ...item, status: "accepted", decided_at: new Date().toISOString() });
      onAccepted(domain, txt);
      setConfirming(null);
      setTyped("");
      setMessage(tx("{0}: la carta firmada ya cuenta para el dominio.", domain.fqdn));
    });

  if (items.length === 0 && mode === "off") return null;

  return (
    <Card
      title={tx("Cartas en firma")}
      description={
        mode === "sandbox"
          ? tx("Mifiel en modo de pruebas: estas firmas no tienen validez legal.")
          : tx("Cartas que Mifiel mandó a firmar por correo. Consulta el estado y confirma la carta firmada.")
      }
      icon={<FileSignature aria-hidden="true" className="h-4 w-4" />}
    >
      {items.length === 0 ? (
        <p className="text-sm text-lt-muted">{tx("Todavía no hay cartas mandadas a firmar.")}</p>
      ) : (
        <ul className="divide-y divide-lt-border">
          {items.map((item) => {
            const s = STATUS[item.status];
            const open = item.status === "sent" || item.status === "creating";
            // Una firma del sandbox no tiene validez legal: la API no la deja confirmar (RC-211, base-1).
            const canAccept = item.status === "signed" && item.environment === "production";
            return (
              <li key={item.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-all tabular-nums text-xs text-lt-text">{item.fqdn}</p>
                    <p className="mt-0.5 text-[11px] text-lt-faint">
                      {item.signer_name ? `${item.signer_name} · ` : ""}
                      {tx("{0} a {1}", formatDate(item.valid_from), formatDate(item.valid_until))}
                      {item.last_checked_at ? tx(" · consultada {0}", formatRelative(item.last_checked_at)) : ""}
                    </p>
                  </div>
                  <Badge tone={s.tone} dot>
                    {s.label}
                  </Badge>
                </div>
                {item.last_error && item.status !== "accepted" && <p className="mt-1.5 text-xs text-lt-red">{item.last_error}</p>}
                {item.status === "signed" && !canAccept && (
                  <p className="mt-1.5 text-xs text-lt-muted">{tx("Firmada en el sandbox de Mifiel: no tiene validez legal y no se puede confirmar.")}</p>
                )}
                {(open || item.status === "signed") && (
                  <div className="mt-2.5 flex flex-wrap items-center justify-end gap-2">
                    {open && (
                      <ActionButton variant="ghost" size="sm" disabled={working !== null} loading={working === item.id} onClick={() => refresh(item)}>
                        {working !== item.id && <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />}
                        {tx("Consultar estado")}</ActionButton>
                    )}
                    {canAccept && confirming !== item.id && (
                      <ActionButton
                        size="sm"
                        disabled={working !== null}
                        onClick={() => {
                          setConfirming(item.id);
                          setTyped("");
                          setMessage(null);
                        }}
                      >
                        {tx("Confirmar")}</ActionButton>
                    )}
                    {/* Una creating se cancela después de revisar en Mifiel; si todavía se está mandando, la API da 409. */}
                    <ActionButton variant="danger" size="sm" disabled={working !== null} onClick={() => cancel(item)}>
                      {tx("Cancelar")}</ActionButton>
                  </div>
                )}
                {canAccept && confirming === item.id && (
                  <form
                    className="mt-2.5 space-y-2 rounded-lg bg-lt-raised/60 p-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (typed.trim().toLowerCase() === item.fqdn) accept(item);
                    }}
                  >
                    <label htmlFor={`confirm-${item.id}`} className="block text-xs text-lt-muted">
                      {tx("Revisa el PDF firmado y escribe")}{" "}<span className="tabular-nums text-lt-text">{item.fqdn}</span> {" "}{tx("para confirmar que la carta autoriza ese dominio.")}</label>
                    <input
                      id={`confirm-${item.id}`}
                      value={typed}
                      onChange={(e) => setTyped(e.target.value)}
                      autoComplete="off"
                      className={`${INPUT} tabular-nums`}
                    />
                    <div className="flex justify-end gap-2">
                      <ActionButton variant="ghost" size="sm" type="button" onClick={() => setConfirming(null)}>
                        {tx("Volver")}</ActionButton>
                      <ActionButton
                        size="sm"
                        type="submit"
                        disabled={working !== null || typed.trim().toLowerCase() !== item.fqdn}
                        loading={working === item.id}
                      >
                        {tx("Confirmar carta")}</ActionButton>
                    </div>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p aria-live="polite" className="mt-2 text-xs text-lt-muted">
        {message}
      </p>
    </Card>
  );
}
