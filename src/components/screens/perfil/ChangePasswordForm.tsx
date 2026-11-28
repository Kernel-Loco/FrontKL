"use client";

import { useRef, useState, type FormEvent } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Field, INPUT } from "@/components/ui/Field";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { PASSKEYS_CHANGED, passwordChangedMessage } from "@/lib/passkeys";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/validation";
import { changePassword } from "@/services/authService";
import { getErrorMessage } from "@/services/errors";
import { tx } from "@/i18n/tx";

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
    if (!current) return setResult({ tone: "error", message: tx("Escribe tu contraseña actual.") });
    if (next.length < PASSWORD_MIN_LENGTH || next.length > PASSWORD_MAX_LENGTH) {
      return setResult({ tone: "error", message: tx("La nueva contraseña debe tener de {0} a {1} caracteres.", PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH) });
    }
    if (next !== confirm) return setResult({ tone: "error", message: tx("Las contraseñas nuevas no coinciden.") });

    setBusy(true);
    setResult(null);
    try {
      const { passkeys_removed } = await changePassword({ current_password: current, new_password: next });
      formRef.current?.reset();
      setResult({ tone: "success", message: passwordChangedMessage(passkeys_removed) });
      // La lista de passkeys del perfil se pide otra vez, ya sin las borradas.
      if (passkeys_removed > 0) window.dispatchEvent(new Event(PASSKEYS_CHANGED));
    } catch (error) {
      setResult({ tone: "error", message: getErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form ref={formRef} method="post" onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label={tx("Contraseña actual")} htmlFor="pw-current">
        <input id="pw-current" name="current" type="password" autoComplete="current-password" className={INPUT} />
      </Field>
      <Field label={tx("Contraseña nueva")} htmlFor="pw-next" hint={tx("Al menos {0} caracteres.", PASSWORD_MIN_LENGTH)}>
        <input id="pw-next" name="next" type="password" autoComplete="new-password" className={INPUT} />
      </Field>
      <Field label={tx("Confirma la contraseña nueva")} htmlFor="pw-confirm">
        <input id="pw-confirm" name="confirm" type="password" autoComplete="new-password" className={INPUT} />
      </Field>
      {result && <InlineAlert tone={result.tone}>{result.message}</InlineAlert>}
      <ActionButton type="submit" loading={busy}>{tx("Actualizar contraseña")}</ActionButton>
    </form>
  );
}
