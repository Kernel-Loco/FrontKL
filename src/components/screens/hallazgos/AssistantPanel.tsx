"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Bot } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { ActionButton, TEXT_LINK } from "@/components/ui/ActionButton";
import { INPUT } from "@/components/ui/Field";
import { InlineAlert } from "@/components/ui/InlineAlert";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  bloquesDeRespuesta,
  citasDeRespuesta,
  esRespuestaAutomatica,
  hallazgosParaAsistente,
  LIMITE_DIARIO_ASISTENTE,
  MAX_HALLAZGOS_ASISTENTE,
  MAX_LARGO_PREGUNTA,
  preguntaValida,
  type Tramo,
} from "@/lib/asistente";
import { askAssistant } from "@/services/assistantService";
import { getErrorMessage, ServiceError } from "@/services/errors";
import type { DomainFinding } from "@/types";

const SUGERENCIAS = [
  "¿Qué debo atender primero y por qué?",
  "Explícame estos hallazgos en palabras simples.",
  "¿Qué riesgo representan para la empresa?",
];

interface Intercambio {
  id: number;
  pregunta: string;
  respuesta: string;
  /** Títulos de los hallazgos enviados, en el orden de `finding_ids`: el primero es el [H1] de la respuesta. */
  titulos: string[];
  /** Ningún modelo respondió: es la respuesta automática con los pasos del plan de acción, no de IA. */
  automatica: boolean;
}

function Texto({ tramos }: { tramos: Tramo[] }) {
  return tramos.map((tramo, indice) =>
    tramo.negrita ? <strong key={indice} className="font-semibold text-lt-text">{tramo.texto}</strong> : <span key={indice}>{tramo.texto}</span>,
  );
}

/** La respuesta del modelo como párrafos y listas de React, nunca como HTML (ver bloquesDeRespuesta). */
function Respuesta({ texto }: { texto: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed text-lt-muted">
      {bloquesDeRespuesta(texto).map((bloque, indice) => {
        if (bloque.tipo === "parrafo") return <p key={indice} className="break-words"><Texto tramos={bloque.tramos} /></p>;
        if (bloque.tipo === "tabla") {
          return (
            // Con tabIndex el desplazamiento horizontal también se alcanza con el teclado en pantallas angostas.
            <div key={indice} tabIndex={0} role="region" aria-label="Tabla de la respuesta" className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr>
                    {bloque.encabezados.map((celda, i) => (
                      <th key={i} scope="col" className="border-b border-lt-border px-2 py-1.5 align-bottom font-semibold text-lt-text">
                        <Texto tramos={celda} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bloque.filas.map((fila, f) => (
                    <tr key={f}>
                      {fila.map((celda, i) => (
                        <td key={i} className="border-b border-lt-border px-2 py-1.5 align-top break-words">
                          <Texto tramos={celda} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        const elementos = bloque.elementos.map((elemento, i) => <li key={i} className="break-words"><Texto tramos={elemento} /></li>);
        if (bloque.tipo === "lista") return <ul key={indice} className="list-disc space-y-1 pl-5">{elementos}</ul>;
        return <ol key={indice} start={bloque.inicio} className="list-decimal space-y-1 pl-5">{elementos}</ol>;
      })}
    </div>
  );
}

/**
 * Asistente de IA de Hallazgos (#38, RC-77). Cada pregunta va sola, sin las anteriores, con los hallazgos más graves de
 * la lista filtrada. Las respuestas solo viven en esta pantalla: la API no guarda preguntas ni respuestas.
 */
export function AssistantPanel({ domain, findings }: { domain: string; findings: DomainFinding[] }) {
  const ids = { titulo: useId(), pregunta: useId(), ayuda: useId() };
  const [pregunta, setPregunta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<{ mensaje: string; codigo: string | null } | null>(null);
  // Única región viva del panel (el error ya es role="alert"): anuncia la espera y la respuesta una sola vez.
  const [anuncio, setAnuncio] = useState("");
  const [intercambios, setIntercambios] = useState<Intercambio[]>([]);
  const control = useRef<AbortController | null>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const siguienteId = useRef(1);
  const router = useRouter();

  // Al salir de la pantalla se corta la espera. La API ya contó la pregunta y no la devuelve: lo dice la ayuda.
  useEffect(() => () => control.current?.abort(), []);

  const enviados = hallazgosParaAsistente(findings);
  const valida = preguntaValida(pregunta);

  async function preguntar(texto: string) {
    const limpia = preguntaValida(texto);
    if (!limpia || enviados.length === 0 || enviando) return;
    control.current?.abort();
    const actual = new AbortController();
    control.current = actual;
    setEnviando(true);
    setError(null);
    setAnuncio("Preparando la respuesta.");
    try {
      const { answer, source } = await askAssistant(domain, limpia, enviados.map((f) => f.id), actual.signal);
      const titulos = enviados.map((f) => f.title);
      const automatica = esRespuestaAutomatica(source);
      setIntercambios((previos) => [
        { id: siguienteId.current++, pregunta: limpia, respuesta: answer, titulos, automatica },
        ...previos,
      ]);
      // Solo se borra si sigue siendo lo enviado: un borrador escrito durante la espera se queda.
      setPregunta((actualTexto) => (actualTexto === texto ? "" : actualTexto));
      setAnuncio(
        automatica
          ? "El asistente de IA no respondió. Llegó una respuesta automática con los pasos del plan de acción."
          : "Llegó la respuesta del asistente.",
      );
    } catch (falla) {
      if (actual.signal.aborted) return;
      setAnuncio("");
      setError({ mensaje: getErrorMessage(falla), codigo: falla instanceof ServiceError ? falla.code : null });
    } finally {
      if (control.current === actual) {
        control.current = null;
        setEnviando(false);
      }
    }
  }

  function recargarHallazgos() {
    setError(null);
    router.refresh();
    // El botón con el foco se va con el aviso: el foco pasa al título del panel y no cae al body.
    titulo.current?.focus();
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    void preguntar(pregunta);
  }

  return (
    <section aria-labelledby={ids.titulo} className="rounded-xl bg-lt-surface p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-lt-raised text-lt-teal">
          <Bot aria-hidden="true" className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 id={ids.titulo} ref={titulo} tabIndex={-1} className="text-base font-semibold text-lt-text">
            Asistente de IA
          </h2>
          <p id={ids.ayuda} className="mt-1 text-sm leading-relaxed text-lt-muted">
            Pregunta en lenguaje simple sobre los hallazgos de la lista. Al modelo van tu pregunta y el título, la categoría
            y la criticidad de hasta {MAX_HALLAZGOS_ASISTENTE} hallazgos, los más graves de la lista con tus filtros; nunca
            la evidencia. No escribas contraseñas ni datos personales en la pregunta. LowTide no guarda tus preguntas ni
            las respuestas. Tienes {LIMITE_DIARIO_ASISTENTE} preguntas cada 24 horas, y cada una cuenta aunque el
            asistente no responda o salgas de la pantalla antes de la respuesta. Si ningún modelo de IA responde, verás
            una respuesta automática con los pasos del plan de acción, marcada como tal.
          </p>
        </div>
      </div>

      {enviados.length === 0 ? (
        <InlineAlert className="mt-4">No hay hallazgos en la lista. Quita los filtros para preguntar sobre ellos.</InlineAlert>
      ) : (
        <form onSubmit={enviar} className="mt-4 space-y-3">
          <p className="text-xs text-lt-muted">
            La pregunta irá con {enviados.length === findings.length ? "los" : `${enviados.length} de los`} {findings.length}{" "}
            {findings.length === 1 ? "hallazgo de la lista" : "hallazgos de la lista"}.
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGERENCIAS.map((sugerencia) => (
              <ActionButton key={sugerencia} variant="secondary" size="sm" disabled={enviando} onClick={() => void preguntar(sugerencia)}>
                {sugerencia}
              </ActionButton>
            ))}
          </div>
          <div>
            <label htmlFor={ids.pregunta} className="mb-1.5 block text-xs font-medium text-lt-muted">
              Tu pregunta
            </label>
            <textarea
              id={ids.pregunta}
              value={pregunta}
              onChange={(e) => setPregunta(e.target.value)}
              maxLength={MAX_LARGO_PREGUNTA}
              rows={3}
              aria-describedby={ids.ayuda}
              placeholder="Por ejemplo: ¿qué significa que el SPF esté mal configurado?"
              className={`${INPUT} h-auto min-h-20 resize-y py-2 leading-relaxed`}
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] tabular-nums text-lt-faint">{pregunta.length} de {MAX_LARGO_PREGUNTA}</span>
              <ActionButton type="submit" loading={enviando} disabled={!valida}>
                Preguntar
              </ActionButton>
            </div>
          </div>
        </form>
      )}

      <p role="status" className="sr-only">{anuncio}</p>
      <div className="mt-4 space-y-4">
        {enviando && (
          <p className="flex items-center gap-2 text-sm text-lt-muted">
            <Spinner className="h-4 w-4" /> Preparando la respuesta. Puede tardar hasta 30 segundos.
          </p>
        )}
        {error && (
          <InlineAlert tone="error">
            {error.mensaje}
            {error.codigo === "assistant_503" && (
              <>
                {" "}
                <Link href={`/dashboard/dominios/${encodeURIComponent(domain)}`} className={TEXT_LINK}>
                  Ir al reporte del dominio
                </Link>
              </>
            )}
            {error.codigo === "assistant_404" && (
              <>
                {" "}
                <button type="button" onClick={recargarHallazgos} className={TEXT_LINK}>
                  Recargar los hallazgos
                </button>
              </>
            )}
          </InlineAlert>
        )}
        {intercambios.map((intercambio) => {
          const total = intercambio.titulos.length;
          const citas = citasDeRespuesta(intercambio.respuesta, total);
          return (
            <article key={intercambio.id} className="rounded-lg bg-lt-bg p-4">
              {intercambio.automatica && (
                <p className="mb-2 inline-flex rounded-md bg-lt-raised px-2 py-0.5 text-[11px] font-semibold text-lt-text">
                  Respuesta automática · no es de IA
                </p>
              )}
              <p className="text-sm font-semibold text-lt-text break-words">{intercambio.pregunta}</p>
              <div className="mt-2">
                <Respuesta texto={intercambio.respuesta} />
              </div>
              {citas.length > 0 && (
                <div className="mt-3 text-xs text-lt-muted">
                  <p className="font-medium">Hallazgos citados</p>
                  <ul className="mt-1 space-y-0.5">
                    {citas.map((n) => (
                      <li key={n} className="break-words">
                        <span className="font-semibold tabular-nums text-lt-text">H{n}</span> {intercambio.titulos[n - 1]}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {intercambio.automatica ? (
                <p className="mt-3 text-[11px] leading-relaxed text-lt-faint">
                  Ningún modelo de IA respondió. Son los pasos del plan de acción para {total}{" "}
                  {total === 1 ? "hallazgo" : "hallazgos"} y no contestan tu pregunta.{" "}
                  <Link href={`/dashboard/plan?dominio=${encodeURIComponent(domain)}`} className={TEXT_LINK}>
                    Ver el plan de acción
                  </Link>
                </p>
              ) : (
                <p className="mt-3 text-[11px] leading-relaxed text-lt-faint">
                  Respuesta generada por IA sobre {total} {total === 1 ? "hallazgo" : "hallazgos"}.
                  Puede equivocarse: confírmala con la explicación de cada hallazgo.
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
