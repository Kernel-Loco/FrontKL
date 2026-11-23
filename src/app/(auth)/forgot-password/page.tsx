import type { Metadata } from "next";
import { AuthTitle } from "@/components/auth/AuthTitle";
import { ForgotPasswordForm } from "@/components/auth/forms/ForgotPasswordForm";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <AuthTitle eyebrow="Recuperar acceso" description="Ingresa el correo de tu cuenta y te enviaremos un enlace para elegir una contraseña nueva.">
        Recuperar contraseña
      </AuthTitle>
      <ForgotPasswordForm />
    </div>
  );
}
