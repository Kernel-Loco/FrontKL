import { TriangleAlert } from "lucide-react";
import { AVISO_DATOS_DE_EJEMPLO, AVISO_SIMULADO, esSimulada, type FuncionDeServicio } from "@/config/simulado";

interface AvisoSimuladoProps {
  /** Funciones que la pantalla usa para crear o cambiar algo. */
  acciones?: FuncionDeServicio[];
  /** Funciones de las que la pantalla lee lo que muestra. */
  datos?: FuncionDeServicio[];
  /** Botones simulados, cuando el resto de la pantalla sí guarda. Por ejemplo: «Exportar PDF». */
  solo?: string;
  /** Parte de la pantalla con datos de ejemplo, cuando el resto es real. Por ejemplo: la tarjeta Reportes. */
  datosDe?: string;
  className?: string;
}

/**
 * Aviso fijo de las pantallas sin conectar a la API (#190). Va arriba, debajo del título.
 * No pinta nada cuando ninguna de sus funciones sigue en `FUNCIONES_SIMULADAS`.
 */
export function AvisoSimulado({ acciones = [], datos = [], solo, datosDe, className = "" }: AvisoSimuladoProps) {
  const simulado = esSimulada(...acciones);
  const deEjemplo = esSimulada(...datos);
  if (!simulado && !deEjemplo) return null;

  return (
    <div
      role="note"
      className={`flex items-start gap-2.5 rounded-lg border border-lt-amber/40 bg-lt-amber/10 px-4 py-3 text-sm text-lt-amber ${className}`}
    >
      <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="min-w-0">
        {simulado && <strong className="font-semibold">{AVISO_SIMULADO}.</strong>}
        {simulado && solo && ` Aplica solo a ${solo}.`}
        {simulado && deEjemplo && " "}
        {deEjemplo && (
          <span className={simulado ? "" : "font-semibold"}>
            {AVISO_DATOS_DE_EJEMPLO}
            {datosDe ? ` en ${datosDe}.` : "."}
          </span>
        )}
      </p>
    </div>
  );
}
