import { Download } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, TableWrap, TD, TH, TR } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Tone } from "@/components/ui/tones";
import { REPORT_KIND_LABELS, REPORT_STATUS_LABELS } from "@/config/labels";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Report, ReportStatus } from "@/types";

const STATUS_TONE: Record<ReportStatus, Tone> = { ready: "teal", pending: "amber", generating: "indigo", failed: "red" };

export function ReportsCard({ reports, action }: { reports: Report[]; action?: React.ReactNode }) {
  return (
    <Card title="Reportes" padded={false} action={action}>
      {reports.length === 0 ? (
        <EmptyState title="Aún no hay reportes" />
      ) : (
        <TableWrap>
          <table className="w-full min-w-[620px]">
            <thead>
              <tr>
                <th scope="col" className={TH}>Reporte</th>
                <th scope="col" className={TH}>Dominio</th>
                <th scope="col" className={TH}>Periodo</th>
                <th scope="col" className={TH}>Estado</th>
                <th scope="col" className={TH}><span className="sr-only">Descargar</span></th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className={TR}>
                  <td className={TD}>
                    {REPORT_KIND_LABELS[r.kind]}
                    {r.generated_at && <span className="block text-xs text-lt-faint">{formatDateTime(r.generated_at)}</span>}
                  </td>
                  <td className={`${TD} font-mono text-[13px] text-lt-muted`}>{r.domain ?? "Todos"}</td>
                  <td className={`${TD} whitespace-nowrap text-[13px] text-lt-muted`}>
                    {formatDate(r.period_start)} – {formatDate(r.period_end)}
                  </td>
                  <td className={TD}>
                    <Badge tone={STATUS_TONE[r.status]} dot>
                      {REPORT_STATUS_LABELS[r.status]}
                    </Badge>
                  </td>
                  <td className={`${TD} text-right`}>
                    {r.download_url && r.status === "ready" && (
                      // TODO: conectar con backend — URL firmada de descarga (GET /reports/{id}/download).
                      <a href={r.download_url} className="inline-flex items-center gap-1.5 rounded-sm text-[13px] font-medium text-lt-teal hover:underline">
                        <Download aria-hidden="true" className="h-3.5 w-3.5" />
                        Descargar<span className="sr-only"> {REPORT_KIND_LABELS[r.kind]}</span>
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </Card>
  );
}
