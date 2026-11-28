import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { AvisoSimplificado } from "@/components/legal/AvisoSimplificado";
import { tx } from "@/i18n/tx";

// Login, MFA, alta y recuperación muestran el aviso simplificado de la sección 5.2 de la política y la frase de
// los términos de la sección 11, con sus enlaces a /privacidad y /terminos (RC-271).
const LINK = "rounded-sm font-semibold text-lt-primary hover:underline";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-white text-lt-ink [--focus-ring:var(--color-lt-primary)] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <aside className="relative isolate flex flex-col overflow-hidden border-b border-lt-line bg-lt-paper px-6 py-8 sm:px-12 lg:border-b-0 lg:border-r lg:py-10">
        {/* Video de fondo del océano (RC-349). Es decorativo: sin sonido ni controles; con movimiento reducido se queda
            el fondo liso. */}
        <video
          aria-hidden="true"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 -z-20 h-full w-full object-cover motion-reduce:hidden"
        >
          <source src="/auth/oceano.mp4" type="video/mp4" />
        </video>
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-lt-paper/70" />
        <Logo tone="light" />
        <div className="my-10 max-w-xl lg:mb-10 lg:mt-32">
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-[2.6rem]">
            {tx("Inteligencia de la superficie de ataque externa")}</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-500">
            {tx("Visibilidad unificada del riesgo en dominios, identidad digital, infraestructura y fugas de datos, explicada para cada rol de tu organización.")}</p>
        </div>
        <p className="hidden items-start gap-2 border-t border-lt-line pt-5 text-xs text-slate-500 lg:mt-auto lg:flex">
          <ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0" />
          {tx("Solo se analizan dominios autorizados. Los datos provienen de fuentes públicas y servicios con licencia como Shodan y HIBP.")}</p>
      </aside>
      <main className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-[340px]">
          {children}
          <p className="mt-8 text-center text-xs text-slate-500">{tx("El acceso está restringido al personal autorizado.")}</p>
          <p className="mt-2 text-center text-xs text-slate-500">
            {tx("Al iniciar sesión aceptas los")}{" "}
            <Link href="/terminos" className={LINK}>
              {tx("términos de uso")}</Link>
            .
          </p>
          <AvisoSimplificado
            className="mt-4 text-[11px] leading-relaxed text-slate-500"
            linkClassName={`${LINK} break-all`}
          />
          <p className="mt-4 text-center text-xs text-slate-500">
            <Link href="/privacidad" className={LINK}>
              {tx("Aviso de privacidad")}</Link>
            {" · "}
            <Link href="/terminos" className={LINK}>
              {tx("Términos de uso")}</Link>
            {" · "}
            <Link href="/seguridad" className={LINK}>
              {tx("Cómo cuida LowTide tus datos")}</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
