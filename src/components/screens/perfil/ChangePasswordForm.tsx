"use client";

import { useRef, useState, type FormEvent } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Field, INPUT } from "@/components/ui/Field";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/validation";
import { changePassword } from "@/services/authService";
import { getErrorMessage } from "@/services/errors";

export function ChangePasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const current = String(data.get("current") ?? "");
    const next = String(data.get("next") ?? "");
    const confirm = String(data.get("confirm") ?? "");
    if (!current) return setResult({ tone: "error", message: "Escribe tu contraseña actual." });
    if (next.length < PASSWORD_MIN_LENGTH || next.length > PASSWORD_MAX_LENGTH) {
      return setResult({ tone: "error", message: `La nueva contraseña debe tener de ${PASSWORD_MIN_LENGTH} a ${PASSWORD_MAX_LENGTH} caracteres.` });
    }
    if (next !== confirm) return setResult({ tone: "error", message: "Las contraseñas nuevas no coinciden." });

    setBusy(true);
    setResult(null);
    try {
      await changePassword({ current_password: current, new_password: next });
      formRef.current?.reset();
      setResult({ tone: "success", message: "Tu contraseña se actualizó." });
    } catch (error) {
      setResult({ tone: "error", message: getErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Contraseña actual" htmlFor="pw-current">
        <input id="pw-current" name="current" type="password" autoComplete="current-password" className={INPUT} />
      </Field>
      <Field label="Contraseña nueva" htmlFor="pw-next" hint={`Al menos ${PASSWORD_MIN_LENGTH} caracteres.`}>
        <input id="pw-next" name="next" type="password" autoComplete="new-password" className={INPUT} />
      </Field>
      <Field label="Confirma la contraseña nueva" htmlFor="pw-confirm">
        <input id="pw-confirm" name="confirm" type="password" autoComplete="new-password" className={INPUT} />
      </Field>
      {result && <InlineAlert tone={result.tone}>{result.message}</InlineAlert>}
      <ActionButton type="submit" loading={busy}>Actualizar contraseña</ActionButton>
    </form>
  );
}
