import type { ReactNode } from "react";

interface CardProps {
  title?: ReactNode;
  /** Texto pequeño o enlace a la derecha del título. */
  action?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  /** `false` para tablas que llegan hasta el borde. */
  padded?: boolean;
  className?: string;
  children: ReactNode;
}

export function Card({ title, action, description, icon, padded = true, className = "", children }: CardProps) {
  const hasHeader = title || action;
  return (
    <section className={`rounded-xl border border-lt-border bg-lt-surface ${className}`}>
      {hasHeader && (
        <header className={`flex items-start justify-between gap-3 ${padded ? "px-5 pt-5" : "border-b border-lt-border px-5 py-4"}`}>
          <div className="flex min-w-0 items-start gap-3">
            {icon && (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-lt-indigo/15 text-lt-indigo-soft">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              {title && <h2 className="text-[15px] font-semibold text-lt-text">{title}</h2>}
              {description && <p className="mt-0.5 text-xs text-lt-muted">{description}</p>}
            </div>
          </div>
          {action && <div className="shrink-0 text-xs text-lt-muted">{action}</div>}
        </header>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

/** Contenedor de tabla con scroll horizontal en pantallas chicas. */
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}

export const TH = "px-5 py-3 text-left text-xs font-medium text-lt-muted";
export const TD = "px-5 py-3.5 align-middle text-sm text-lt-text";
export const TR = "border-t border-lt-border";
