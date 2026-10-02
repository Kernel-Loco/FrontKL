"use client";

import { useId, useState, type InputHTMLAttributes, type Ref } from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { FieldError } from "./FieldError";

interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "placeholder"> {
  /** Texto del label (oculto visualmente) y del placeholder. */
  label: string;
  icon?: LucideIcon;
  error?: string;
  ref?: Ref<HTMLInputElement>;
}

export function TextInput({ label, icon: Icon, error, type = "text", id, ref, className = "", ...rest }: TextInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const isPassword = type === "password";
  const [visible, setVisible] = useState(false);

  return (
    <div className={`w-full ${className}`}>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            aria-hidden="true"
            strokeWidth={1.5}
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white"
          />
        )}
        <input
          ref={ref}
          id={inputId}
          type={isPassword && visible ? "text" : type}
          placeholder={label}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`auth-input h-11 w-full rounded-[4px] border bg-transparent text-sm text-white outline-none transition-colors placeholder:text-[13px] placeholder:uppercase placeholder:tracking-wide placeholder:text-white/85 focus-visible:ring-2 focus-visible:ring-white/70 ${
            Icon ? "pl-14" : "pl-4"
          } ${isPassword ? "pr-12" : "pr-4"} ${error ? "border-red-300" : "border-white/90 focus:border-white"}`}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={visible}
            aria-controls={inputId}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1.5 text-white hover:bg-white/10"
          >
            {visible ? (
              <Eye aria-hidden="true" className="h-5 w-5" strokeWidth={1.5} />
            ) : (
              <EyeOff aria-hidden="true" className="h-5 w-5" strokeWidth={1.5} />
            )}
          </button>
        )}
      </div>
      <FieldError id={errorId} message={error} />
    </div>
  );
}
