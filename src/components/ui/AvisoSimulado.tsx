import { AVISO_DATOS_DE_EJEMPLO, AVISO_SIMULADO, esSimulada, type FuncionDeServicio } from "@/config/simulado";
import { tx } from "@/i18n/tx";

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
      className={`flex items-start gap-2.5 rounded-lg bg-lt-raised px-4 py-3 text-sm text-lt-text ${className}`}
    >
      <span aria-hidden="true" className="mt-[0.45em] h-2 w-2 shrink-0 rounded-[2px] bg-lt-indigo-soft" />
      <p className="min-w-0">
        {simulado && <strong className="font-semibold">{tx(AVISO_SIMULADO)}.</strong>}
        {simulado && solo && tx(" Aplica solo a {0}.", solo)}
        {simulado && deEjemplo && " "}
        {deEjemplo && (
          <span className={simulado ? "" : "font-semibold"}>
            {tx(AVISO_DATOS_DE_EJEMPLO)}
            {datosDe ? tx(" en {0}.", datosDe) : "."}
          </span>
        )}
      </p>
    </div>
  );
}
