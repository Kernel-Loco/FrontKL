import type { Metadata } from "next";
import { AuthTitle } from "@/components/auth/AuthTitle";
import { MfaForm } from "@/components/auth/forms/MfaForm";

export const metadata: Metadata = { title: "Verificación en dos pasos" };

export default function MfaPage() {
  return (
    <div className="space-y-6">
      <AuthTitle eyebrow="Paso 2 de 2" description="Ingresa el código de 6 dígitos de tu app autenticadora.">
        Verificación en dos pasos
      </AuthTitle>
      <MfaForm />
    </div>
  );
}
