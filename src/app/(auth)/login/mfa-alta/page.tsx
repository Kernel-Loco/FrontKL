import type { Metadata } from "next";
import { AuthTitle } from "@/components/auth/AuthTitle";
import { MfaEnrollForm } from "@/components/auth/forms/MfaEnrollForm";

export const metadata: Metadata = { title: "Activar la verificación en dos pasos" };

// Alta de TOTP al entrar (RC-5): el Admin sin TOTP llega aquí desde el 403 de /auth/login.
export default function MfaEnrollPage() {
  return (
    <div className="space-y-6">
      <AuthTitle eyebrow="Paso 2 de 2" description="Tu cuenta necesita la verificación en dos pasos para entrar.">
        Activa la verificación en dos pasos
      </AuthTitle>
      <MfaEnrollForm />
    </div>
  );
}
