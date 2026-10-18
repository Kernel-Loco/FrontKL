"use client";

import { useState } from "react";
import { Check, Hourglass, RefreshCw, ShieldCheck } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { formatRelative } from "@/lib/format";
import { verifyTxt } from "@/services/domainService";
import { getErrorMessage } from "@/services/errors";
import type { TxtVerification } from "@/types";

export function TxtVerificationList({ items, onChange }: { items: TxtVerification[]; onChange: (item: TxtVerification) => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [checking, setChecking] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setMessage("No se pudo copiar. Selecciona el texto y cópialo a mano.");
    }
  };

  const check = async (fqdn: string) => {
    setChecking(fqdn);
    setMessage(null);
    try {
      const result = await verifyTxt(fqdn);
      onChange(result);
      setMessage(result.status === "verified" ? `${fqdn}: registro TXT verificado.` : `${fqdn}: todavía no encontramos el registro TXT.`);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setChecking(null);
    }
  };

  const latest = items.reduce<string | null>((max, i) => (i.checked_at && (!max || i.checked_at > max) ? i.checked_at : max), null);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-lt-text">Verificación TXT</h3>
        <Badge tone="indigo">
          <ShieldCheck aria-hidden="true" className="h-3 w-3" /> Solo Admin
        </Badge>
      </div>
      <ul className="mt-3 divide-y divide-lt-border">
        {items.map((item) => (
          <li key={item.fqdn} className="py-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2.5 font-mono text-xs text-lt-muted">
                <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${item.status === "verified" ? "bg-lt-teal" : "bg-lt-amber"}`} />
                {item.fqdn}
              </span>
              {item.status === "verified" ? (
                <span className="flex items-center gap-1 text-xs font-medium text-lt-teal">
                  <Check aria-hidden="true" className="h-3.5 w-3.5" /> Verificado
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium text-lt-amber">
                  <Hourglass aria-hidden="true" className="h-3.5 w-3.5" /> Pendiente
                </span>
              )}
            </div>
            {item.status !== "verified" && (
              <div className="mt-2.5 space-y-2">
                <div className="flex items-center justify-between gap-2 rounded-lg border border-lt-border bg-lt-bg px-3 py-2">
                  <code className="min-w-0 break-all font-mono text-xs text-lt-text">{item.expected_value}</code>
                  <ActionButton variant="secondary" size="sm" onClick={() => copy(item.expected_value)} className="!border-lt-indigo/50 !text-lt-indigo-soft">
                    {copied === item.expected_value ? "Copiado" : "Copiar"}
                  </ActionButton>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-lt-faint">Publícalo como registro TXT en {item.fqdn} y verifica.</p>
                  <ActionButton variant="ghost" size="sm" loading={checking === item.fqdn} onClick={() => check(item.fqdn)}>
                    {checking !== item.fqdn && <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />}
                    Verificar ahora
                  </ActionButton>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <p aria-live="polite" className="mt-2 text-xs text-lt-muted">
        {message}
      </p>
      {latest && <p className="mt-1 font-mono text-[11px] text-lt-faint">Actualizado {formatRelative(latest)}</p>}
    </div>
  );
}
