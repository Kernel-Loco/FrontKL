import Link from "next/link";
import { TEXT_LINK } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { TableWrap, TR } from "@/components/ui/Card";

const TH = "px-3 py-3 text-left text-xs font-medium text-lt-muted first:pl-5 last:pr-5";
const TD = "px-3 py-3.5 align-middle text-sm text-lt-text first:pl-5 last:pr-5";
import { SOLID_TONES } from "@/components/ui/tones";
import { formatDate } from "@/lib/format";
import type { Domain } from "@/types";
import { domainState } from "../shared/domainState";

interface RegisteredDomainsTableProps {
  domains: Domain[];
  canOpenDetail: boolean;
}

export function RegisteredDomainsTable({ domains, canOpenDetail }: RegisteredDomainsTableProps) {
  return (
    <TableWrap>
      <table className="w-full min-w-[560px]">
        <thead>
          <tr>
            <th scope="col" className={`${TH} font-mono uppercase tracking-wider !text-[10px]`}>Dominio</th>
            <th scope="col" className={`${TH} font-mono uppercase tracking-wider !text-[10px]`}>Autorizó</th>
            <th scope="col" className={`${TH} font-mono uppercase tracking-wider !text-[10px]`}>Vigencia</th>
            <th scope="col" className={`${TH} font-mono uppercase tracking-wider !text-[10px]`}>Estado</th>
            <th scope="col" className={TH}><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          {domains.map((d) => {
            const state = domainState(d);
            const { valid_until } = d.authorization;
            return (
              <tr key={d.id} className={TR}>
                <td className={`${TD} whitespace-nowrap font-mono text-[13px]`}>
                  <span aria-hidden="true" className={`mr-2.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${SOLID_TONES[state.tone].bg}`} />
                  {d.fqdn}
                </td>
                <td className={`${TD} break-all text-[13px] text-lt-muted`}>{d.authorization.signer_email ?? "—"}</td>
                <td className={`${TD} whitespace-nowrap text-[13px] text-lt-muted`}>
                  {valid_until ? `${d.authorization.status === "expired" ? "venció " : "hasta "}${formatDate(valid_until)}` : "—"}
                </td>
                <td className={TD}>
                  <Badge tone={state.tone} dot>
                    {state.label}
                  </Badge>
                </td>
                <td className={`${TD} text-right`}>
                  {canOpenDetail && d.score !== null && (
                    <Link href={`/dashboard/dominios/${d.fqdn}`} className={`${TEXT_LINK} text-[13px]`}>
                      Ver<span className="sr-only"> {d.fqdn}</span>
                    </Link>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableWrap>
  );
}
