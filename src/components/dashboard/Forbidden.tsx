import Link from "next/link";
import { ShieldX } from "lucide-react";

interface ForbiddenProps {
  sectionLabel: string;
  roleLabel: string;
}

export function Forbidden({ sectionLabel, roleLabel }: ForbiddenProps) {
  return (
    <div className="mx-auto mt-8 max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
        <ShieldX aria-hidden="true" className="h-7 w-7 text-red-600" />
      </div>
      <p className="text-sm font-semibold text-red-700">Error 403</p>
      <h1 className="mt-1 text-xl font-bold text-slate-900">Acceso denegado</h1>
      <p className="mt-2 text-sm text-slate-600">
        Tu rol (<strong className="font-semibold">{roleLabel}</strong>) no tiene permiso para ver «{sectionLabel}». Si
        necesitas acceso, pídeselo a un Admin.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex items-center rounded-lg bg-cirdan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cirdan-600"
      >
        Volver al resumen
      </Link>
    </div>
  );
}
