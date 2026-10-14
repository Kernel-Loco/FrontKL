import { Card } from "@/components/ui/Card";
import { CATEGORY_LABELS } from "@/config/labels";
import type { DomainFinding } from "@/types";

export interface Change {
  domain: string;
  finding: DomainFinding;
}

export function RecentChanges({ changes }: { changes: Change[] }) {
  return (
    <Card title="Cambios desde el último escaneo">
      {changes.length === 0 ? (
        <p className="text-sm text-lt-muted">Sin cambios en los últimos escaneos.</p>
      ) : (
        <ul className="-my-3 divide-y divide-lt-border">
          {changes.map(({ domain, finding }) => (
            <li key={finding.id} className="py-3">
              <p className="text-sm font-medium text-lt-text">{finding.title}</p>
              <p className="mt-0.5 text-xs text-lt-muted">
                <span className="font-mono">{finding.asset === domain ? domain : finding.asset}</span> · {CATEGORY_LABELS[finding.category]}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
