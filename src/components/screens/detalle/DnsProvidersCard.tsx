import { Card } from "@/components/ui/Card";
import { proveedoresDns, type RegistrosDns } from "@/lib/proveedoresDns";
import type { Asset } from "@/types";
import { tx } from "@/i18n/tx";

function ListaRegistros({ titulo, registros }: { titulo: string; registros: RegistrosDns }) {
  return (
    <section className="min-w-0">
      <h3 className="text-sm font-semibold text-lt-text">{titulo}</h3>
      {registros.estado === "no_disponible" ? (
        <p className="mt-2 text-sm text-lt-muted">{tx("No disponible en los datos guardados.")}</p>
      ) : (
        <>
          {registros.servidores.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {registros.servidores.map((servidor, index) => (
                <li key={`${servidor.host}-${servidor.prioridad ?? ""}-${index}`} className="break-all tabular-nums text-sm text-lt-text">
                  {servidor.host === "." && servidor.prioridad !== undefined ? tx("MX nulo (.)") : servidor.host}
                  {servidor.prioridad !== undefined && <span className="ml-2 font-sans text-xs text-lt-muted">{tx("Prioridad")}{" "}{servidor.prioridad}</span>}
                </li>
              ))}
            </ul>
          ) : !registros.incompleto ? (
            <p className="mt-2 text-sm text-lt-muted">{tx("No se registraron servidores.")}</p>
          ) : null}
          {registros.incompleto && <p className="mt-2 text-xs text-lt-amber">{tx("Algunos registros no se pudieron mostrar por tener un formato desconocido.")}</p>}
        </>
      )}
    </section>
  );
}

export function DnsProvidersCard({ assets, dominio }: { assets: Asset[]; dominio: string }) {
  const { mx, ns } = proveedoresDns(assets, dominio);
  return (
    <Card title={tx("Proveedores visibles desde el DNS")} description={tx("Servidores publicados para correo y DNS")}>
      <p className="mb-4 text-xs leading-relaxed text-lt-muted">
        {tx("Son registros guardados del dominio, no una confirmación de quién presta el servicio. Pueden estar desactualizados, especialmente si el DNS no se consultó en el último escaneo.")}</p>
      <div className="grid gap-5 sm:grid-cols-2">
        <ListaRegistros titulo={tx("Correo (MX)")} registros={mx} />
        <ListaRegistros titulo={tx("Servidores DNS (NS)")} registros={ns} />
      </div>
    </Card>
  );
}
