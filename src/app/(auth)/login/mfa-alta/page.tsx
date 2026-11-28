import type { Metadata } from "next";
import { AuthTitle } from "@/components/auth/AuthTitle";
import { MfaEnrollForm } from "@/components/auth/forms/MfaEnrollForm";
import { tx, localized } from "@/i18n/tx";

export const metadata: Metadata = localized({ title: "Activar la verificación en dos pasos" });

// Alta de TOTP al entrar (RC-5): el Admin sin TOTP llega aquí desde el 403 de /auth/login.
export default function MfaEnrollPage() {
  return (
    <div className="space-y-6">
      <AuthTitle eyebrow={tx("Paso 2 de 2")} description={tx("Tu cuenta necesita la verificación en dos pasos para entrar.")}>
        {tx("Activa la verificación en dos pasos")}</AuthTitle>
      <MfaEnrollForm />
    </div>
  );
}
