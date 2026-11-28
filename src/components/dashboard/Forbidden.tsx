import Link from "next/link";
import { ShieldX } from "lucide-react";
import { tx } from "@/i18n/tx";

interface ForbiddenProps {
  sectionLabel: string;
  roleLabel: string;
}

export function Forbidden({ sectionLabel, roleLabel }: ForbiddenProps) {
  return (
    <div className="mx-auto mt-8 max-w-lg rounded-xl bg-lt-surface p-8 text-center">
      <ShieldX aria-hidden="true" className="mx-auto mb-4 h-7 w-7 text-lt-red" />
      <p className="text-sm font-semibold text-lt-red">{tx("Error 403")}</p>
      <h1 className="mt-1 text-xl font-bold text-lt-text">{tx("Acceso denegado")}</h1>
      <p className="mt-2 text-sm text-lt-muted">
        {tx("Tu rol (")}<strong className="font-semibold text-lt-text">{roleLabel}</strong>{tx(") no tiene permiso para ver «")}{sectionLabel}{tx("». Si necesitas acceso, pídeselo a un Administrador.")}</p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex items-center rounded-lg bg-lt-indigo px-4 py-2 text-sm font-semibold text-white hover:bg-lt-indigo/90"
      >
        {tx("Volver al dashboard")}</Link>
    </div>
  );
}
