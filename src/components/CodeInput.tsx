"use client";

import { useId, useRef, useState, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from "react";
import { FieldError } from "./FieldError";

interface CodeInputProps {
  /** Número de dígitos (4 para recuperación, 6 para MFA TOTP). */
  length: number;
  /** Recibe el código actual; tiene `length` caracteres solo cuando está completo. */
  onChange: (code: string) => void;
  /** Nombre accesible del grupo de casillas. */
  label: string;
  disabled?: boolean;
  error?: string;
  autoFocus?: boolean;
}

/**
 * Casillas de código numérico. Para limpiarlo desde el padre, cámbiale el `key`.
 */
export function CodeInput({ length, onChange, label, disabled, error, autoFocus = true }: CodeInputProps) {
  const [digits, setDigits] = useState<string[]>(() => Array(length).fill(""));
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const errorId = `${useId()}-error`;

  const focusAt = (index: number) => {
    const el = inputs.current[Math.max(0, Math.min(index, length - 1))];
    el?.focus();
    el?.select();
  };

  const commit = (next: string[]) => {
    setDigits(next);
    onChange(next.join(""));
  };

  const setDigit = (index: number, value: string) => {
    const next = [...digits];
    next[index] = value;
    commit(next);
  };

  /** Reparte varios dígitos (pegado o autocompletado) a partir de una casilla. */
  const fillFrom = (start: number, raw: string) => {
    const chars = raw.replace(/\D/g, "").slice(0, length - start).split("");
    if (chars.length === 0) return;
    const next = [...digits];
    chars.forEach((char, offset) => {
      next[start + offset] = char;
    });
    commit(next);
    focusAt(start + chars.length);
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      setDigit(index, event.key);
      focusAt(index + 1);
      return;
    }

    switch (event.key) {
      case "Backspace":
        event.preventDefault();
        if (digits[index]) {
          setDigit(index, "");
        } else if (index > 0) {
          setDigit(index - 1, "");
          focusAt(index - 1);
        }
        break;
      case "Delete":
        event.preventDefault();
        setDigit(index, "");
        break;
      case "ArrowLeft":
        event.preventDefault();
        focusAt(index - 1);
        break;
      case "ArrowRight":
        event.preventDefault();
        focusAt(index + 1);
        break;
      case "Home":
        event.preventDefault();
        focusAt(0);
        break;
      case "End":
        event.preventDefault();
        focusAt(length - 1);
        break;
    }
  };

  // Cubre teclados móviles (que no reportan la tecla en keydown) y el
  // autocompletado de códigos de un solo uso.
  const handleChange = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.replace(/\D/g, "");
    if (!value) {
      setDigit(index, "");
    } else if (value.length === 1) {
      setDigit(index, value);
      focusAt(index + 1);
    } else if (value.length === 2 && digits[index]) {
      // Se escribió sobre una casilla llena: conserva el dígito nuevo.
      setDigit(index, value.startsWith(digits[index]) ? value[1] : value[0]);
      focusAt(index + 1);
    } else {
      fillFrom(index, value);
    }
  };

  const handlePaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
    // Un código completo siempre se pega desde la primera casilla.
    fillFrom(pasted.length >= length ? 0 : index, pasted);
  };

  return (
    <div>
      <div
        role="group"
        aria-label={label}
        aria-describedby={error ? errorId : undefined}
        className="flex justify-center gap-1.5 sm:gap-2"
      >
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            autoFocus={autoFocus && index === 0}
            aria-label={`Dígito ${index + 1} de ${length}`}
            aria-invalid={error ? true : undefined}
            disabled={disabled}
            value={digit}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onChange={(e) => handleChange(index, e)}
            onPaste={(e) => handlePaste(index, e)}
            onFocus={(e) => e.target.select()}
            className={`h-12 w-10 rounded-lg border-2 bg-white text-center text-xl font-medium text-cirdan-indigo caret-cirdan-indigo outline-none transition focus-visible:ring-4 focus-visible:ring-white/60 disabled:opacity-70 sm:w-11 ${
              error ? "border-red-400" : "border-cirdan-indigo/70 focus:border-cirdan-indigo"
            }`}
          />
        ))}
      </div>
      <div className="flex justify-center">
        <FieldError id={errorId} message={error} />
      </div>
    </div>
  );
}
