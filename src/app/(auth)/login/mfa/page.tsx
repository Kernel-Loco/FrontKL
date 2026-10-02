import type { Metadata } from "next";
import { AuthTitle } from "@/components/auth/AuthTitle";
import { MfaForm } from "@/components/auth/forms/MfaForm";

export const metadata: Metadata = { title: "Verificación MFA" };

export default function MfaPage() {
  return (
    <div className="space-y-6">
      <AuthTitle>MFA Verification</AuthTitle>
      <MfaForm />
    </div>
  );
}
