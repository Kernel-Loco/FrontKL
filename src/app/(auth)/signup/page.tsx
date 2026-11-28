import type { Metadata } from "next";
import { AuthPrompt } from "@/components/auth/AuthLinks";
import { AuthTitle } from "@/components/auth/AuthTitle";
import { SignUpForm } from "@/components/auth/forms/SignUpForm";
import { tx, localized } from "@/i18n/tx";

export const metadata: Metadata = localized({ title: "Crear cuenta" });

export default function SignUpPage() {
  return (
    <div className="space-y-6">
      <AuthTitle eyebrow={tx("Nueva cuenta")}>{tx("Crear cuenta")}</AuthTitle>
      <SignUpForm />
      <AuthPrompt text={tx("¿Ya tienes cuenta?")} linkText={tx("Inicia sesión")} href="/login" />
    </div>
  );
}
