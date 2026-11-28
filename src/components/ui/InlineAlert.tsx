type Tone = "info" | "success" | "warning" | "error";

// El tono va en un recuadro de color al inicio, sin ícono (RC-373): el texto ya dice de qué se trata.
const STYLES: Record<Tone, { box: string; mark: string }> = {
  info: { box: "text-lt-muted", mark: "bg-lt-faint" },
  success: { box: "text-lt-text", mark: "bg-lt-green" },
  warning: { box: "text-lt-text", mark: "bg-lt-indigo-soft" },
  error: { box: "text-lt-red", mark: "bg-lt-red" },
};

export function InlineAlert({ tone = "info", children, className = "" }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  const { box, mark } = STYLES[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-lg bg-lt-raised px-3 py-2.5 text-xs leading-relaxed ${box} ${className}`}
    >
      <span aria-hidden="true" className={`mt-[0.45em] h-2 w-2 shrink-0 rounded-[2px] ${mark}`} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
