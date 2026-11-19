// Página pública: se abre con o sin sesión, porque src/proxy.ts no la intercepta. Todo su texto sale de
// src/config/legal.ts, copia de las secciones 5.2 y 5.7 de la política (RC-271).
import type { Metadata } from "next";
import { AvisoSimplificado } from "@/components/legal/AvisoSimplificado";
import { PaginaLegal } from "@/components/legal/PaginaLegal";
import { ARCO, AVISO_INTEGRAL } from "@/config/legal";

export const metadata: Metadata = { title: "Aviso de privacidad" };

const H2 = "text-lg font-semibold text-lt-text";
const TEXTO = "text-sm leading-relaxed text-lt-muted";
const LINK = "font-medium text-lt-indigo-soft underline underline-offset-2";

export default function PrivacidadPage() {
  return (
    <PaginaLegal eyebrow="Privacidad" titulo={AVISO_INTEGRAL.titulo} origen="las secciones 5.2 y 5.7">
      <section className="space-y-4">
        <p className={TEXTO}>{AVISO_INTEGRAL.intro}</p>
        <ol className={`list-decimal space-y-3 pl-5 ${TEXTO}`}>
          {AVISO_INTEGRAL.puntos.map((punto) => (
            <li key={punto.texto}>
              {punto.texto}
              {"subpuntos" in punto && (
                <ul className="mt-2 list-disc space-y-2 pl-5">
                  {punto.subpuntos.map((subpunto) => (
                    <li key={subpunto}>{subpunto}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="aviso-simplificado" className="space-y-3">
        <h2 id="aviso-simplificado" className={H2}>
          Aviso simplificado
        </h2>
        <p className={TEXTO}>{AVISO_INTEGRAL.simplificadoTitulo}</p>
        <blockquote className="border-l-2 border-lt-indigo-soft pl-4">
          <AvisoSimplificado className={TEXTO} linkClassName={LINK} />
        </blockquote>
      </section>

      <section aria-labelledby="arco" className="space-y-4">
        <h2 id="arco" className={H2}>
          {ARCO.titulo}
        </h2>
        <div role="region" aria-label="Tabla desplazable horizontalmente" tabIndex={0} className="relative overflow-x-auto rounded-xl border border-lt-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-lt-surface text-lt-text">
              <tr>
                {ARCO.columnas.map((columna) => (
                  <th key={columna} scope="col" className="px-4 py-3 font-semibold">
                    {columna}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-lt-border">
              {ARCO.filas.map((fila) => (
                <tr key={fila[0]} className="align-top">
                  {fila.map((celda, i) => (
                    <td key={i} className="px-4 py-3 leading-relaxed text-lt-muted">
                      {celda}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={TEXTO}>{ARCO.tramite}</p>
        <ol className={`list-decimal space-y-3 pl-5 ${TEXTO}`}>
          {ARCO.pasos.map((paso) => (
            <li key={paso}>{paso}</li>
          ))}
        </ol>
      </section>
    </PaginaLegal>
  );
}
