import { Construction } from "lucide-react";

export function UnderConstruction() {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <Construction aria-hidden="true" className="h-10 w-10 text-cirdan-500" />
      <p className="mt-3 text-base font-semibold text-slate-900">En construcción</p>
      <p className="mt-1 text-sm text-slate-600">Esta sección estará disponible en una próxima versión.</p>
    </div>
  );
}
