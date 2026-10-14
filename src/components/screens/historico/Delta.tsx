/** Cambio de score: ▲ sube el riesgo (naranja), ▼ baja (azul), = sin cambio. */
export function Delta({ value }: { value: number }) {
  if (value === 0) return <span className="text-lt-muted">= 0</span>;
  const up = value > 0;
  return (
    <span className={`whitespace-nowrap tabular-nums ${up ? "text-lt-orange" : "text-lt-blue"}`}>
      <span aria-hidden="true">{up ? "▲" : "▼"}</span>
      <span className="sr-only">{up ? "subió" : "bajó"}</span> {Math.abs(value)}
    </span>
  );
}
