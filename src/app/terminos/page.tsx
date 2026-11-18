// Página pública: se abre con o sin sesión, porque src/proxy.ts no la intercepta. Todo su texto sale de
// src/config/legal.ts, copia de la sección 11 de la política (RC-271).
import type { Metadata } from "next";
import { PaginaLegal } from "@/components/legal/PaginaLegal";
import { TERMINOS } from "@/config/legal";

export const metadata: Metadata = { title: "Términos de uso" };

const TEXTO = "text-sm leading-relaxed text-lt-muted";

export default function TerminosPage() {
  return (
    <PaginaLegal eyebrow="Términos" titulo={TERMINOS.titulo} origen="la sección 11">
      <section className="space-y-4">
        <p className={TEXTO}>{TERMINOS.intro}</p>
        <ol className={`list-decimal space-y-3 pl-5 ${TEXTO}`}>
          {TERMINOS.puntos.map((punto) => (
            <li key={punto}>{punto}</li>
          ))}
        </ol>
      </section>
    </PaginaLegal>
  );
}
