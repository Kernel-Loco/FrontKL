import type { Metadata } from "next";
import { AuthTitle } from "@/components/auth/AuthTitle";
import { ResetPasswordForm } from "@/components/auth/forms/ResetPasswordForm";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <AuthTitle eyebrow="Recuperar acceso · Paso 3 de 3" description="Elige una contraseña nueva de al menos 12 caracteres.">
        Nueva contraseña
      </AuthTitle>
      <ResetPasswordForm />
    </div>
  );
}
