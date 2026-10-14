import { Badge } from "@/components/ui/Badge";
import { TableWrap, TD, TH, TR } from "@/components/ui/Card";
import { AUDIT_ACTION_LABELS, AUDIT_ACTOR_LABELS } from "@/config/labels";
import { formatDateTime } from "@/lib/format";
import type { AuditEntry } from "@/types";

function detailText(details: Record<string, unknown>) {
  return Object.entries(details)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
    .join(" · ");
}

export function AuditTable({ entries }: { entries: AuditEntry[] }) {
  return (
    <TableWrap>
      <table className="w-full min-w-[680px]">
        <thead>
          <tr>
            <th scope="col" className={TH}>Fecha</th>
            <th scope="col" className={TH}>Quién</th>
            <th scope="col" className={TH}>Acción</th>
            <th scope="col" className={TH}>Detalle</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className={TR}>
              <td className={`${TD} whitespace-nowrap text-[13px] text-lt-muted`}>{formatDateTime(e.occurred_at)}</td>
              <td className={TD}>
                <span className="block text-[13px]">{e.actor ?? "Lowtide"}</span>
                <Badge tone={e.actor_type === "system" ? "gray" : e.actor_type === "api_key" ? "amber" : "indigo"} className="mt-1">
                  {AUDIT_ACTOR_LABELS[e.actor_type]}
                </Badge>
              </td>
              <td className={TD}>
                <span className="block text-[13px]">{AUDIT_ACTION_LABELS[e.action] ?? e.action}</span>
                <code className="font-mono text-[11px] text-lt-faint">{e.action}</code>
              </td>
              <td className={`${TD} max-w-56 break-words font-mono text-[11px] text-lt-muted`}>{detailText(e.details)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrap>
  );
}
