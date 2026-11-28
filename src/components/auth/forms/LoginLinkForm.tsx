"use client";

import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Notice } from "@/components/auth/Notice";
import { Button } from "@/components/Button";
import { Spinner } from "@/components/Spinner";
import { writeFlow } from "@/lib/flowStorage";
import { tokenFromHash } from "@/lib/loginLink";
import { redeemLoginLink } from "@/services/authService";
import { getErrorMessage } from "@/services/errors";
import { tx } from "@/i18n/tx";

const NO_TOKEN = "El enlace no es válido o ya venció. Pide otro o entra con tu contraseña.";

const noSubscribe = () => () => {};
let captured: string | null | undefined;

/** El token va después de # y solo existe en el navegador. Se lee una vez y se quita de la barra de direcciones y del
 * historial, para que no quede a la vista ni se comparta al copiar la URL. */
function readLinkToken(): string | null {
  if (captured === undefined) {
    captured = tokenFromHash(window.location.hash);
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
  }
  return captured;
}

/** Canjea el enlace del correo (#28, RC-63). Solo con un POST al pulsar «Entrar»: abrir la página no gasta el token,
 * así el revisor de enlaces del correo del Tec puede visitarla sin dejar al usuario sin enlace. */
export function LoginLinkForm() {
  const router = useRouter();
  // undefined en el servidor (todavía no se sabe), null sin token válido.
  const linkToken = useSyncExternalStore(noSubscribe, readLinkToken, () => undefined);
  const [spent, setSpent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sent = useRef(false);
  const token = spent ? null : linkToken;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || sent.current) return;
    sent.current = true;
    setError(null);
    setBusy(true);
    try {
      const result = await redeemLoginLink({ token });
      if (result.mfa_required) {
        writeFlow("mfa", { mfa_token: result.mfa_token });
        router.push("/login/mfa");
      } else {
        router.replace("/dashboard");
        router.refresh();
      }
    } catch (err) {
      // El token ya se gastó o no sirve: no se vuelve a intentar con él.
      setSpent(true);
      setError(getErrorMessage(err, { apiMessageOn403: true }));
      setBusy(false);
    }
  };

  if (linkToken === undefined) {
    return (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <Notice tone="error">{error ?? tx(NO_TOKEN)}</Notice>
        <Link href="/login" className="block text-center text-sm font-medium text-lt-primary hover:underline">
          {tx("Volver a iniciar sesión")}</Link>
      </div>
    );
  }

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="space-y-4">
      <Button type="submit" loading={busy}>
        {tx("Entrar a LowTide")}</Button>
      <Link href="/login" className="block text-center text-sm font-medium text-lt-primary hover:underline">
        {tx("Entrar con contraseña o passkey")}</Link>
    </form>
  );
}
