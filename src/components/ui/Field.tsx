import type { ReactNode } from "react";

export const INPUT =
  "h-10 w-full rounded-lg border border-lt-border bg-lt-raised px-3 text-sm text-lt-text outline-none transition placeholder:text-lt-faint focus:border-lt-indigo focus-visible:ring-2 focus-visible:ring-lt-indigo/30 disabled:opacity-60";
export const SELECT = `${INPUT} pr-8`;
export const CHECKBOX = "h-4 w-4 shrink-0 rounded border-lt-border bg-lt-raised accent-lt-indigo";

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}

/** Label, control y mensaje de error o ayuda de un campo del portal. */
export function Field({ label, htmlFor, error, hint, className = "", children }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-lt-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-xs font-medium text-lt-red">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-lt-faint">{hint}</p>
      )}
    </div>
  );
}
