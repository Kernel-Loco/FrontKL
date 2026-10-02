import type { LucideIcon } from "lucide-react";

/** Tarjeta clara con ícono, usada en los pasos de verificación por código. */
export function IconCard({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className="mx-auto flex h-[70px] w-20 items-center justify-center rounded-lg bg-cirdan-mist shadow-sm">
      <Icon aria-hidden="true" className="h-10 w-10 text-cirdan-indigo" strokeWidth={1.4} />
    </div>
  );
}
