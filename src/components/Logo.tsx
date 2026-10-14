interface LogoMarkProps {
  className?: string;
  /** Con fondo (cuadro oscuro, para el acceso claro) o solo las formas (portal oscuro). */
  framed?: boolean;
}

/** Marea de Lowtide: tres cuartos de círculo que bajan de tamaño. */
export function LogoMark({ className = "h-8 w-8", framed = false }: LogoMarkProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      {framed && <rect width="32" height="32" rx="7" fill="#15161c" />}
      <path d="M5 26V12a14 14 0 0 1 14 14z" fill="#5b6cf0" />
      <path d="M15 26v-7a7 7 0 0 1 7 7z" fill="#5ec8d0" />
      <path d="M22 26v-3.6a3.6 3.6 0 0 1 3.6 3.6z" fill="#5ec8d0" fillOpacity="0.75" />
    </svg>
  );
}

interface LogoProps {
  /** `light` para fondos claros (texto oscuro), `dark` para el portal. */
  tone?: "light" | "dark";
  className?: string;
}

export function Logo({ tone = "dark", className = "" }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark framed={tone === "light"} className="h-9 w-9" />
      <span className={`text-[15px] font-extrabold tracking-[0.04em] ${tone === "light" ? "text-lt-ink" : "text-white"}`}>
        LOWTIDE
      </span>
    </span>
  );
}
