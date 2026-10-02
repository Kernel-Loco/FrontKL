import { SOURCE_LABELS } from "@/config/labels";
import { formatDateTime, formatPercent } from "@/lib/format";
import type { Finding } from "@/types";
import { SeverityBadge } from "../SeverityBadge";

function NotApplicable() {
  return (
    <>
      <span aria-hidden="true" className="text-slate-400">—</span>
      <span className="sr-only">No aplica</span>
    </>
  );
}

export function FindingsTable({ findings }: { findings: Finding[] }) {
  return (
    <section aria-labelledby="recent-findings" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <h2 id="recent-findings" className="text-base font-semibold text-slate-900">
          Hallazgos recientes
        </h2>
        <span className="text-xs text-slate-500">{findings.length} hallazgos · últimas 48 h</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-5 py-3">Hallazgo</th>
              <th scope="col" className="px-5 py-3">Activo</th>
              <th scope="col" className="px-5 py-3">Severidad</th>
              <th scope="col" className="px-5 py-3">Fuente</th>
              <th scope="col" className="px-5 py-3 text-right">CVSS</th>
              <th scope="col" className="px-5 py-3 text-right">EPSS</th>
              <th scope="col" className="whitespace-nowrap px-5 py-3">Detectado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {findings.map((finding) => (
              <tr key={finding.id} className="hover:bg-slate-50/70">
                <td className="min-w-64 px-5 py-3.5">
                  <span className="font-medium text-slate-900">{finding.title}</span>
                  {finding.in_kev && (
                    <span
                      title="Vulnerabilidad en el catálogo CISA KEV (explotada activamente)"
                      className="ml-2 inline-block rounded border border-red-300 px-1.5 py-px align-middle text-[10px] font-bold uppercase tracking-wide text-red-700"
                    >
                      KEV
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-slate-700">{finding.asset}</td>
                <td className="px-5 py-3.5">
                  <SeverityBadge severity={finding.severity} />
                </td>
                <td className="px-5 py-3.5">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {SOURCE_LABELS[finding.source]}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right tabular-nums text-slate-700">
                  {finding.cvss !== null ? finding.cvss.toFixed(1) : <NotApplicable />}
                </td>
                <td className="px-5 py-3.5 text-right tabular-nums text-slate-700">
                  {finding.epss !== null ? formatPercent(finding.epss) : <NotApplicable />}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{formatDateTime(finding.detected_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
