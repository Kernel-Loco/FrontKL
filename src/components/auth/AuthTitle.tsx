interface AuthTitleProps {
  /** Texto pequeño sobre el título, como «Acceso seguro» o «Paso 2 de 2». */
  eyebrow?: string;
  description?: string;
  children: React.ReactNode;
}

export function AuthTitle({ eyebrow, description, children }: AuthTitleProps) {
  return (
    <div>
      {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-wider text-lt-primary">{eyebrow}</p>}
      <h1 className="mt-1 text-[1.75rem] font-extrabold tracking-tight text-lt-ink">{children}</h1>
      {description && <p className="mt-1.5 text-sm text-slate-500">{description}</p>}
    </div>
  );
}
