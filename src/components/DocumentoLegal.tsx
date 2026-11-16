// Página pública de un documento legal (aviso de privacidad o términos de uso). Sus textos salen de
// src/config/legal.ts y se abre con o sin sesión, porque src/proxy.ts no la intercepta.
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Card } from "@/components/ui/Card";
import type { DocumentoLegal as Documento } from "@/config/legal";

export function DocumentoLegal({ documento, etiqueta, children }: { documento: Documento; etiqueta: string; children?: React.ReactNode }) {
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

      <main className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8 md:px-8 md:py-12">
        <div>
          <p className="text-sm font-semibold text-lt-indigo-soft">{etiqueta}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-[1.75rem]">{documento.titulo}</h1>
          <p className="mt-3 text-sm leading-relaxed text-lt-muted">{documento.intro}</p>
          <p className="mt-2 text-xs text-lt-muted">Versión del {documento.fecha}.</p>
        </div>

        {children}

        <div className="space-y-4">
          {documento.apartados.map((apartado) => (
            <Card key={apartado.titulo} title={apartado.titulo}>
              <div className="space-y-3">
                {apartado.parrafos.map((parrafo) => (
                  <p key={parrafo} className="text-sm leading-relaxed text-lt-muted">
                    {parrafo}
                  </p>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <nav aria-label="Documentos" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-lt-muted">
          <Link href="/privacidad" className="underline-offset-2 hover:underline">
            Aviso de privacidad
          </Link>
          <Link href="/terminos" className="underline-offset-2 hover:underline">
            Términos de uso
          </Link>
          <Link href="/seguridad" className="underline-offset-2 hover:underline">
            Seguridad
          </Link>
        </nav>
      </main>
    </div>
  );
}
