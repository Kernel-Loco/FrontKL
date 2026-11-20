"use client";

import { useId, useMemo, useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { INPUT, SELECT } from "@/components/ui/Field";
import { AUDIT_ACTION_LABELS, AUDIT_ACTOR_LABELS } from "@/config/labels";
import type { AuditActorType, AuditEntry } from "@/types";
import { AuditTable } from "./AuditTable";

export function AuditExplorer({ entries }: { entries: AuditEntry[] }) {
  const searchId = useId();
  const actorId = useId();
  const integrityId = useId();
  const [query, setQuery] = useState("");
  const [actor, setActor] = useState<AuditActorType | "">("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter(
      (e) =>
        (!actor || e.actor_type === actor) &&
        (!q || `${e.action} ${AUDIT_ACTION_LABELS[e.action] ?? ""} ${e.actor ?? ""} ${JSON.stringify(e.details)}`.toLowerCase().includes(q)),
    );
  }, [entries, query, actor]);

  return (
    <Card padded={false}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-lt-border p-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-lt-text">Integridad de la bitácora</h2>
          <p id={integrityId} className="mt-1 text-xs text-lt-muted">
            La verificación todavía no está disponible. Los registros mostrados son de ejemplo y no permiten comprobar la cadena real.
          </p>
        </div>
        <ActionButton variant="secondary" disabled aria-describedby={integrityId}>
          Verificar integridad
        </ActionButton>
      </div>
      <div className="grid gap-3 border-b border-lt-border p-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          <label htmlFor={searchId} className="mb-1.5 block text-xs font-medium text-lt-muted">Buscar</label>
          <input id={searchId} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Acción, usuario, dominio…" className={INPUT} />
        </div>
        <div>
          <label htmlFor={actorId} className="mb-1.5 block text-xs font-medium text-lt-muted">Quién</label>
          <select id={actorId} value={actor} onChange={(e) => setActor(e.target.value as AuditActorType | "")} className={SELECT}>
            <option value="">Todos</option>
            {(Object.keys(AUDIT_ACTOR_LABELS) as AuditActorType[]).map((a) => (
              <option key={a} value={a}>{AUDIT_ACTOR_LABELS[a]}</option>
            ))}
          </select>
        </div>
      </div>
      {visible.length === 0 ? <EmptyState title="Ningún registro coincide" /> : <AuditTable entries={visible} />}
      <p className="border-t border-lt-border px-5 py-3 text-xs text-lt-faint">
        La bitácora está diseñada para admitir solo inserciones y encadenar cada registro con el anterior mediante hashes.
      </p>
    </Card>
  );
}
