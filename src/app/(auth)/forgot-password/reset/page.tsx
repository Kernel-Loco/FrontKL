import type { Metadata } from "next";
import { AuthTitle } from "@/components/auth/AuthTitle";
import { ResetPasswordForm } from "@/components/auth/forms/ResetPasswordForm";
import { tx, localized } from "@/i18n/tx";

// Destino del enlace del correo (RC-335): PORTAL_URL/forgot-password/reset#t=<token>. El fragmento nunca va en el
// Referer, y no-referrer además deja sin Referer cualquier petición que salga de esta página.
export const metadata: Metadata = localized({ title: "Nueva contraseña", referrer: "no-referrer" });

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <AuthTitle eyebrow={tx("Recuperar acceso · Paso 3 de 3")} description={tx("Elige una contraseña nueva de al menos 12 caracteres. El enlace sirve una sola vez y al guardarla se cierran todas tus sesiones.")}>
        {tx("Nueva contraseña")}</AuthTitle>
      <ResetPasswordForm />
    </div>
  );
}
