import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-white text-lt-ink [--focus-ring:var(--color-lt-primary)] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <aside className="flex flex-col border-b border-lt-line bg-lt-paper px-6 py-8 sm:px-12 lg:border-b-0 lg:border-r lg:py-10">
        <Logo tone="light" />
        <div className="my-10 max-w-xl lg:my-auto">
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-[2.6rem]">
            Inteligencia de la superficie de ataque externa
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-500">
            Visibilidad unificada del riesgo en dominios, identidad digital, infraestructura y fugas de datos, explicada
            para cada rol de tu organización.
          </p>
        </div>
        <p className="hidden items-start gap-2 border-t border-lt-line pt-5 text-xs text-slate-500 lg:flex">
          <ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0" />
          Solo se analizan dominios autorizados. Los datos provienen de fuentes públicas y servicios con licencia como
          Shodan y HIBP.
        </p>
      </aside>
      <main className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-[340px]">
          {children}
          <p className="mt-8 text-center text-xs text-slate-500">El acceso está restringido al personal autorizado.</p>
        </div>
      </main>
    </div>
  );
}
