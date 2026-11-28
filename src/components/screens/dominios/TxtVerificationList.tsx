"use client";

import { useState } from "react";
import { Check, Hourglass, RefreshCw, ShieldCheck } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { PREFIJO_FALSO } from "@/config/simulado";
import { formatRelative } from "@/lib/format";
import { verifyTxt } from "@/services/domainService";
import { getErrorMessage } from "@/services/errors";
import type { Domain, TxtVerification } from "@/types";
import { tx } from "@/i18n/tx";

export function TxtVerificationList({ items, onChange }: { items: TxtVerification[]; onChange: (domain: Domain, item: TxtVerification) => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [checking, setChecking] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setMessage(tx("No se pudo copiar. Selecciona el texto y cópialo a mano."));
    }
  };

  const check = async (fqdn: string) => {
    setChecking(fqdn);
    setMessage(null);
    try {
      const { domain, txt } = await verifyTxt(fqdn);
      onChange(domain, txt);
      setMessage(txt.status === "verified" ? tx("{0}: registro TXT verificado.", fqdn) : tx("{0}: el registro TXT no coincide o todavía no se encuentra.", fqdn));
    } catch (error) {
      setMessage(getErrorMessage(error, { apiMessageOn403: true }));
    } finally {
      setChecking(null);
    }
  };

  const latest = items.reduce<string | null>((max, i) => (i.checked_at && (!max || i.checked_at > max) ? i.checked_at : max), null);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-lt-text">{tx("Verificación TXT")}</h3>
        <Badge tone="indigo">
          <ShieldCheck aria-hidden="true" className="h-3 w-3" /> {" "}{tx("Solo Administrador")}</Badge>
      </div>
      <ul className="mt-3 divide-y divide-lt-border">
        {items.map((item) => (
          <li key={item.fqdn} className="py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2.5 tabular-nums text-xs text-lt-muted">
                <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.status === "verified" ? "bg-lt-teal" : "bg-lt-amber"}`} />
                <span className="break-all">{item.fqdn}</span>
              </span>
              {item.status === "verified" ? (
                <span className="flex items-center gap-1 text-xs font-medium text-lt-teal">
                  <Check aria-hidden="true" className="h-3.5 w-3.5" /> {" "}{tx("Verificado")}</span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium text-lt-amber">
                  <Hourglass aria-hidden="true" className="h-3.5 w-3.5" /> {" "}{tx("Pendiente")}</span>
              )}
            </div>
            {item.status !== "verified" && (
              <div className="mt-2.5 space-y-2">
                <div className="flex items-center justify-between gap-2 rounded-lg bg-lt-bg px-3 py-2">
                  <code className="min-w-0 break-all tabular-nums text-xs text-lt-text">{item.expected_value}</code>
                  <ActionButton variant="secondary" size="sm" disabled={item.expected_value.includes(PREFIJO_FALSO)} onClick={() => copy(item.expected_value)} className="!border-lt-indigo/50 !text-lt-indigo-soft">
                    {copied === item.expected_value ? tx("Copiado") : tx("Copiar")}
                  </ActionButton>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 break-words text-[11px] text-lt-faint">
                    {item.expected_value.includes(PREFIJO_FALSO)
                      ? tx("Este dominio es simulado y no se puede verificar.")
                      : tx("Publícalo como registro TXT en {0} y verifica.", item.fqdn)}
                  </p>
                  <ActionButton variant="ghost" size="sm" disabled={checking !== null || item.expected_value.includes(PREFIJO_FALSO)} loading={checking === item.fqdn} onClick={() => check(item.fqdn)}>
                    {checking !== item.fqdn && <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />}
                    {tx("Verificar ahora")}</ActionButton>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <p aria-live="polite" className="mt-2 text-xs text-lt-muted">
        {message}
      </p>
      {latest && <p className="mt-1 tabular-nums text-[11px] text-lt-faint">{tx("Actualizado")}{" "}{formatRelative(latest)}</p>}
    </div>
  );
}
