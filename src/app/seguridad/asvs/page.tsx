// Página pública, como /seguridad: se abre con o sin sesión, porque src/proxy.ts no la intercepta. Todo su texto sale
// de src/config/asvs.ts.
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui/Badge";
import type { Tone } from "@/components/ui/tones";
import { ASVS, type EstadoAsvs } from "@/config/asvs";

export const metadata = { title: "Revisión OWASP ASVS" };

const H2 = "text-lg font-semibold text-lt-text";

/** Cómo se muestra cada estado. Un «No cumple» ya tiene su plan: se muestra como en corrección. */
const ESTADOS: Record<EstadoAsvs, { etiqueta: string; tono: Tone }> = {
  Cumple: { etiqueta: "Cumple", tono: "green" },
  "No cumple": { etiqueta: "En corrección", tono: "amber" },
  "No aplica": { etiqueta: "No aplica", tono: "gray" },
};

export default function AsvsPage() {
  const { requisitos, capitulos } = ASVS;
  const cuenta = (estado: EstadoAsvs) => requisitos.filter((r) => r.estado === estado).length;
  const conRequisitos = capitulos
    .map((capitulo) => ({ ...capitulo, lista: requisitos.filter((r) => r.id.startsWith(`${capitulo.id}.`)) }))
    .filter((capitulo) => capitulo.lista.length > 0);
  const sinRequisitos = capitulos.filter((c) => !conRequisitos.some((con) => con.id === c.id));

  return (
    <div className="lt-dark min-h-dvh bg-lt-bg text-lt-text">
      <header className="border-b border-lt-border">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <Link href="/" aria-label="LowTide, ir al portal" className="rounded-sm">
            <Logo />
          </Link>
          <Link href="/seguridad" className="text-sm font-medium text-lt-indigo-soft underline-offset-2 hover:underline">
            Volver a Seguridad
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl space-y-10 px-4 py-8 md:px-8 md:py-12">
        <div>
          <p className="text-sm font-semibold text-lt-indigo-soft">Seguridad</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-[1.75rem]">{ASVS.titulo}</h1>
          <p className="mt-3 text-sm leading-relaxed text-lt-muted">{ASVS.intro}</p>
          <p className="mt-2 text-xs text-lt-muted">Revisión del {ASVS.fecha}.</p>
        </div>

        <section aria-labelledby="resumen">
          <h2 id="resumen" className={H2}>
            Resumen
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-lt-border bg-lt-surface px-4 py-3">
              <dt className="text-xs text-lt-muted">Requisitos</dt>
              <dd className="mt-1 text-2xl font-bold">{requisitos.length}</dd>
            </div>
            {(Object.keys(ESTADOS) as EstadoAsvs[]).map((estado) => (
              <div key={estado} className="rounded-xl border border-lt-border bg-lt-surface px-4 py-3">
                <dt className="text-xs text-lt-muted">{ESTADOS[estado].etiqueta}</dt>
                <dd className="mt-1 text-2xl font-bold">{cuenta(estado)}</dd>
              </div>
            ))}
          </dl>
        </section>

        {conRequisitos.map((capitulo) => (
          <section key={capitulo.id} aria-labelledby={`cap-${capitulo.id}`}>
            <h2 id={`cap-${capitulo.id}`} className={H2}>
              {capitulo.id} · {capitulo.nombre}
            </h2>
            <ul className="mt-4 divide-y divide-lt-border rounded-xl border border-lt-border bg-lt-surface">
              {capitulo.lista.map((requisito) => (
                <li key={requisito.id} className="px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className="tabular-nums text-xs font-semibold text-lt-muted">{requisito.id}</span>
                    <Badge tone={ESTADOS[requisito.estado].tono} dot>
                      {ESTADOS[requisito.estado].etiqueta}
                    </Badge>
                  </div>
                  <h3 className="mt-1.5 text-sm font-semibold text-lt-text">{requisito.titulo}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-lt-muted">{requisito.texto}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <footer className="space-y-2 border-t border-lt-border pt-6 text-xs leading-relaxed text-lt-muted">
          {sinRequisitos.length > 0 && (
            <p>
              Sin requisitos de nivel 1: {sinRequisitos.map((c) => `${c.id} ${c.nombre}`).join(" y ")}.
            </p>
          )}
          <p>{ASVS.atribucion}</p>
        </footer>
      </main>
    </div>
  );
}
