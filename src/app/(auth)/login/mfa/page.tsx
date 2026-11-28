import type { Metadata } from "next";
import { AuthTitle } from "@/components/auth/AuthTitle";
import { MfaForm } from "@/components/auth/forms/MfaForm";
import { tx, localized } from "@/i18n/tx";

export const metadata: Metadata = localized({ title: "Verificación en dos pasos" });

export default function MfaPage() {
  return (
    <div className="space-y-6">
      <AuthTitle eyebrow={tx("Paso 2 de 2")} description={tx("Ingresa el código de 6 dígitos de tu app autenticadora.")}>
        {tx("Verificación en dos pasos")}</AuthTitle>
      <MfaForm />
    </div>
  );
}
