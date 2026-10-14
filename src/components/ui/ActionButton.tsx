import type { ButtonHTMLAttributes } from "react";
import Link from "next/link";
import { Spinner } from "../Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-gradient-to-r from-lt-indigo to-lt-teal text-white shadow-sm hover:brightness-110",
  secondary: "border border-lt-border bg-lt-raised text-lt-text hover:border-lt-faint",
  ghost: "text-lt-muted hover:bg-white/5 hover:text-lt-text",
  danger: "border border-lt-red/40 bg-lt-red/10 text-lt-red hover:bg-lt-red/20",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
};

function classes(variant: Variant, size: Size, className: string) {
  return `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
}

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

/** Botón del portal (tema oscuro). */
export function ActionButton({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  type = "button",
  className = "",
  children,
  ...rest
}: ActionButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes(variant, size, className)}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

interface ActionLinkProps {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}

export function ActionLink({ href, variant = "secondary", size = "md", className = "", children }: ActionLinkProps) {
  return (
    <Link href={href} className={classes(variant, size, className)}>
      {children}
    </Link>
  );
}

/** Enlace de texto subrayado, como «Ver detalle». */
export const TEXT_LINK = "rounded-sm font-medium text-lt-teal underline-offset-2 hover:underline";
