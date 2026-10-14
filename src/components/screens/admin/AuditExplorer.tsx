"use client";

import { useId, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { INPUT, SELECT } from "@/components/ui/Field";
import { AUDIT_ACTION_LABELS, AUDIT_ACTOR_LABELS } from "@/config/labels";
import type { AuditActorType, AuditEntry } from "@/types";
import { AuditTable } from "./AuditTable";

export function AuditExplorer({ entries }: { entries: AuditEntry[] }) {
  const searchId = useId();
  const actorId = useId();
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
        La bitácora solo admite inserciones y cada registro se encadena con el anterior por hash: no se puede modificar ni borrar.
      </p>
    </Card>
  );
}
