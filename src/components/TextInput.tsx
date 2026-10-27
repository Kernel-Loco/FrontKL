"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode, type Ref } from "react";
import { Eye, EyeOff } from "lucide-react";
import { FieldError } from "./FieldError";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  /** Contenido a la derecha del label, como el enlace «¿Olvidaste tu contraseña?». */
  labelAction?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

/** Campo de las pantallas de acceso (fondo claro), con label visible. */
export function TextInput({ label, error, labelAction, type = "text", id, ref, className = "", ...rest }: TextInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const isPassword = type === "password";
  const [visible, setVisible] = useState(false);

  return (
    <div className={`w-full ${className}`}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={inputId} className="text-xs font-medium text-slate-600">
          {label}
        </label>
        {labelAction}
      </div>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={isPassword && visible ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`h-11 w-full rounded-lg border bg-lt-field px-3.5 text-sm text-lt-ink outline-none transition-colors placeholder:text-slate-400 focus:border-lt-primary focus:bg-white focus-visible:ring-2 focus-visible:ring-lt-primary/25 ${
            isPassword ? "pr-11" : ""
          } ${error ? "border-red-400" : "border-lt-line"}`}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={visible}
            aria-controls={inputId}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            {visible ? <Eye aria-hidden="true" className="h-4 w-4" /> : <EyeOff aria-hidden="true" className="h-4 w-4" />}
          </button>
        )}
      </div>
      <FieldError id={errorId} message={error} />
    </div>
  );
}
