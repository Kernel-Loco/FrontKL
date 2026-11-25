// Marco de las páginas públicas del aviso de privacidad y de los términos de uso (RC-271). Se abren con o sin
// sesión, porque src/proxy.ts no intercepta /privacidad ni /terminos.
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { POLITICA } from "@/config/legal";

interface PaginaLegalProps {
  eyebrow: string;
  titulo: string;
  /** Secciones de la política de donde sale el texto, como "las secciones 5.2 y 5.7". */
  origen: string;
  children: React.ReactNode;
}

export function PaginaLegal({ eyebrow, titulo, origen, children }: PaginaLegalProps) {
  return (
    <div className="lt-dark min-h-dvh bg-lt-bg text-lt-text">
      <header className="border-b border-lt-border">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <Link href="/" aria-label="LowTide, ir al portal" className="rounded-sm">
            <Logo />
          </Link>
          <nav aria-label="Documentos" className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-sm font-medium">
            <Link href="/privacidad" className="text-lt-indigo-soft underline-offset-2 hover:underline">
              Aviso de privacidad
            </Link>
            <Link href="/terminos" className="text-lt-indigo-soft underline-offset-2 hover:underline">
              Términos de uso
            </Link>
            <Link href="/" className="text-lt-indigo-soft underline-offset-2 hover:underline">
              Ir al portal
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl space-y-10 px-4 py-8 md:px-8 md:py-12">
        <div>
          <p className="text-sm font-semibold text-lt-indigo-soft">{eyebrow}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-[1.75rem]">{titulo}</h1>
          <p className="mt-2 text-xs text-lt-muted">
            Texto de {origen} de la {POLITICA.nombre}, versión {POLITICA.version} del {POLITICA.fecha}.
          </p>
        </div>
        {children}
      </main>
    </div>
  );
}
