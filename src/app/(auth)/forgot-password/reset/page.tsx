import type { Metadata } from "next";
import { AuthTitle } from "@/components/auth/AuthTitle";
import { ResetPasswordForm } from "@/components/auth/forms/ResetPasswordForm";

// Destino del enlace del correo (RC-335): PORTAL_URL/forgot-password/reset#t=<token>. El fragmento nunca va en el
// Referer, y no-referrer además deja sin Referer cualquier petición que salga de esta página.
export const metadata: Metadata = { title: "Nueva contraseña", referrer: "no-referrer" };

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <AuthTitle eyebrow="Recuperar acceso · Paso 3 de 3" description="Elige una contraseña nueva de al menos 12 caracteres. El enlace sirve una sola vez y al guardarla se cierran todas tus sesiones.">
        Nueva contraseña
      </AuthTitle>
      <ResetPasswordForm />
    </div>
  );
}
