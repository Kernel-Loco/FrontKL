import Link from "next/link";
import { ShieldX } from "lucide-react";

interface ForbiddenProps {
  sectionLabel: string;
  roleLabel: string;
}

export function Forbidden({ sectionLabel, roleLabel }: ForbiddenProps) {
  return (
    <div className="mx-auto mt-8 max-w-lg rounded-xl border border-lt-border bg-lt-surface p-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-lt-red/10">
        <ShieldX aria-hidden="true" className="h-7 w-7 text-lt-red" />
      </div>
      <p className="text-sm font-semibold text-lt-red">Error 403</p>
      <h1 className="mt-1 text-xl font-bold text-lt-text">Acceso denegado</h1>
      <p className="mt-2 text-sm text-lt-muted">
        Tu rol (<strong className="font-semibold text-lt-text">{roleLabel}</strong>) no tiene permiso para ver «{sectionLabel}».
        Si necesitas acceso, pídeselo a un Administrador.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex items-center rounded-lg bg-gradient-to-r from-lt-indigo to-lt-teal px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
      >
        Volver al dashboard
      </Link>
    </div>
  );
}
