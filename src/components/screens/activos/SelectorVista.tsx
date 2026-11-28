import Link from "next/link";
import { ListTree, Rows3 } from "lucide-react";
import type { Vista } from "@/lib/arbolActivos";
import { tx, localized } from "@/i18n/tx";

const VISTAS: { value: Vista; label: string; Icono: typeof Rows3 }[] = localized([
  { value: "lista", label: "Lista", Icono: Rows3 },
  { value: "arbol", label: "Árbol", Icono: ListTree },
]);

/** Lista o árbol de 'Activos' (RC-248): dos enlaces y el de la vista actual con aria-current. */
export function SelectorVista({ vista, href }: { vista: Vista; href: (vista: Vista) => string }) {
  return (
    <nav aria-label={tx("Vista de activos")} className="inline-flex rounded-lg border border-lt-border p-0.5">
      {VISTAS.map(({ value, label, Icono }) => (
        <Link key={value} href={href(value)} aria-current={vista === value ? "page" : undefined}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium ${vista === value ? "bg-lt-raised text-lt-text" : "text-lt-muted hover:text-lt-text"}`}>
          <Icono aria-hidden="true" className="h-4 w-4" />{label}
        </Link>
      ))}
    </nav>
  );
}
