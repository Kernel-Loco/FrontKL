import Image from "next/image";

interface LogoMarkProps {
  className?: string;
}

/** Marca de Lowtide usada junto al nombre en todas las vistas. */
export function LogoMark({ className = "h-8 w-auto" }: LogoMarkProps) {
  return <Image src="/lowtide-mark.svg" alt="" width={594} height={313} className={className} />;
}

interface LogoProps {
  /** `light` para fondos claros (texto oscuro), `dark` para el portal. */
  tone?: "light" | "dark";
  className?: string;
}

export function Logo({ tone = "dark", className = "" }: LogoProps) {
  return (
    <span className={`inline-flex items-end gap-2.5 ${className}`}>
      <LogoMark className="h-8 w-auto shrink-0" />
      <span className={`translate-y-px text-xl font-black leading-none tracking-normal ${tone === "light" ? "text-lt-ink" : "text-white"}`}>
        LOWTIDE
      </span>
    </span>
  );
}
