import type { Asset } from "@/types";

export interface ServidorDns {
  host: string;
  prioridad?: number;
}

export type RegistrosDns =
  | { estado: "no_disponible" }
  | { estado: "disponible"; servidores: ServidorDns[]; incompleto: boolean };

export interface ProveedoresDns {
  mx: RegistrosDns;
  ns: RegistrosDns;
}

function objeto(valor: unknown): valor is Record<string, unknown> {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor);
}

function leerRegistros(valor: unknown, tipo: "mx" | "ns"): RegistrosDns {
  if (!Array.isArray(valor)) return { estado: "no_disponible" };
  const servidores: ServidorDns[] = [];
  for (const registro of valor) {
    if (tipo === "ns" && typeof registro === "string" && registro.trim()) {
      servidores.push({ host: registro.trim() });
    } else if (tipo === "mx" && objeto(registro) && typeof registro.host === "string" && registro.host.trim()
      && typeof registro.prioridad === "number" && Number.isInteger(registro.prioridad)
      && registro.prioridad >= 0 && registro.prioridad <= 65535) {
      servidores.push({ host: registro.host.trim(), prioridad: registro.prioridad });
    }
  }
  return { estado: "disponible", servidores, incompleto: servidores.length !== valor.length };
}

/** Lee solo el DNS guardado en el activo raíz; no consulta la red ni infiere quién es dueño del servicio. */
export function proveedoresDns(assets: Pick<Asset, "type" | "value" | "attributes">[], dominio: string): ProveedoresDns {
  const raiz = assets.find((asset) =>
    asset.type === "domain" && asset.value.toLowerCase().replace(/\.$/, "") === dominio.toLowerCase().replace(/\.$/, ""),
  );
  const dns = raiz && objeto(raiz.attributes?.dns) ? raiz.attributes.dns : {};
  return { mx: leerRegistros(dns.mx, "mx"), ns: leerRegistros(dns.ns, "ns") };
}
