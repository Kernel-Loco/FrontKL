import type { Metadata } from "next";
import { AuthTitle } from "@/components/auth/AuthTitle";
import { VerifyResetCodeForm } from "@/components/auth/forms/VerifyResetCodeForm";

export const metadata: Metadata = { title: "Revisa tu correo" };

export default function VerifyResetCodePage() {
  return (
    <div className="space-y-6">
      <AuthTitle eyebrow="Recuperar acceso · Paso 2 de 3">Revisa tu correo</AuthTitle>
      <VerifyResetCodeForm />
    </div>
  );
}
