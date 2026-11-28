import type { Metadata } from "next";
import { AuthTitle } from "@/components/auth/AuthTitle";
import { ForgotPasswordForm } from "@/components/auth/forms/ForgotPasswordForm";
import { tx, localized } from "@/i18n/tx";

export const metadata: Metadata = localized({ title: "Recuperar contraseña" });

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <AuthTitle eyebrow={tx("Recuperar acceso")} description={tx("Ingresa el correo de tu cuenta y te enviaremos un enlace para elegir una contraseña nueva.")}>
        {tx("Recuperar contraseña")}</AuthTitle>
      <ForgotPasswordForm />
    </div>
  );
}
