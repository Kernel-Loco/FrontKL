import type { ButtonHTMLAttributes } from "react";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-white text-cirdan-blue shadow-[0_4px_14px_rgba(0,0,0,0.35)] hover:bg-cirdan-50",
  secondary: "bg-cirdan-700 text-white shadow-[0_4px_14px_rgba(0,0,0,0.25)] hover:bg-cirdan-600",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Muestra un spinner y deshabilita el botón para evitar envíos dobles. */
  loading?: boolean;
}

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  type = "button",
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-[4px] px-4 text-sm font-semibold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-75 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
