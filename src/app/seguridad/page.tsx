// Página pública: se abre con o sin sesión, porque src/proxy.ts no la intercepta. Todo su texto sale de
// src/config/seguridad.ts.
import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Card } from "@/components/ui/Card";
import { SEGURIDAD } from "@/config/seguridad";

export const metadata = { title: "Seguridad" };

const H2 = "text-lg font-semibold text-lt-text";

export default function SeguridadPage() {
  const { diagrama } = SEGURIDAD;
  return (
    <div className="lt-dark min-h-dvh bg-lt-bg text-lt-text">
      <header className="border-b border-lt-border">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <Link href="/" aria-label="LowTide, ir al portal" className="rounded-sm">
            <Logo />
          </Link>
          <Link href="/" className="text-sm font-medium text-lt-indigo-soft underline-offset-2 hover:underline">
            Ir al portal
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl space-y-10 px-4 py-8 md:px-8 md:py-12">
        <div>
          <p className="text-sm font-semibold text-lt-indigo-soft">Seguridad</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-[1.75rem]">{SEGURIDAD.titulo}</h1>
          <p className="mt-3 text-sm leading-relaxed text-lt-muted">{SEGURIDAD.intro}</p>
          <p className="mt-2 text-xs text-lt-muted">Resumen de seguridad del {SEGURIDAD.fecha}.</p>
        </div>

        <section aria-labelledby="arquitectura">
          <h2 id="arquitectura" className={H2}>
            Arquitectura
          </h2>
          <a
            href={diagrama.src}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block rounded-xl border border-lt-border bg-white p-2 sm:p-4"
          >
            <Image
              src={diagrama.src}
              alt={diagrama.alt}
              width={diagrama.width}
              height={diagrama.height}
              sizes="(min-width: 896px) 832px, 100vw"
              className="h-auto w-full"
            />
            <span className="sr-only"> (abre el diagrama en una pestaña nueva)</span>
          </a>
          <p className="mt-2 text-xs text-lt-muted">Toca el diagrama para abrirlo en grande.</p>
        </section>

        <section aria-labelledby="fronteras">
          <h2 id="fronteras" className={H2}>
            Fronteras de confianza
          </h2>
          <p className="mt-1.5 text-sm text-lt-muted">{SEGURIDAD.fronterasIntro}</p>
          <ul className="mt-4 divide-y divide-lt-border rounded-xl border border-lt-border bg-lt-surface">
            {SEGURIDAD.fronteras.map((frontera) => (
              <li key={frontera.id} className="flex gap-4 px-5 py-4">
                <span className="mt-0.5 h-fit shrink-0 rounded-md bg-lt-red/15 px-2 py-0.5 font-mono text-xs font-semibold text-lt-red">
                  {frontera.id}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-lt-text">{frontera.nombre}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-lt-muted">{frontera.texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="controles">
          <h2 id="controles" className={H2}>
            Controles que ya funcionan
          </h2>
          <p className="mt-1.5 text-sm text-lt-muted">Qué se cuida en cada parte de LowTide y cómo.</p>
          <div className="mt-4 space-y-4">
            {SEGURIDAD.grupos.map((grupo) => (
              <Card key={grupo.donde} title={grupo.donde}>
                <dl className="space-y-4">
                  {grupo.controles.map((control) => (
                    <div key={control.tema}>
                      <dt className="text-sm font-semibold text-lt-text">{control.tema}</dt>
                      <dd className="mt-1 text-sm leading-relaxed text-lt-muted">{control.texto}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
