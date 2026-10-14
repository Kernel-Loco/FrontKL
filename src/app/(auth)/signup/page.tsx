import type { Metadata } from "next";
import { AuthPrompt } from "@/components/auth/AuthLinks";
import { AuthTitle } from "@/components/auth/AuthTitle";
import { SignUpForm } from "@/components/auth/forms/SignUpForm";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function SignUpPage() {
  return (
    <div className="space-y-6">
      <AuthTitle eyebrow="Nueva cuenta">Crear cuenta</AuthTitle>
      <SignUpForm />
      <AuthPrompt text="¿Ya tienes cuenta?" linkText="Inicia sesión" href="/login" />
    </div>
  );
}
