import type { Metadata } from "next";
import { AuthTitle } from "@/components/auth/AuthTitle";
import { ResetEmailSent } from "@/components/auth/forms/ResetEmailSent";
import { tx, localized } from "@/i18n/tx";

export const metadata: Metadata = localized({ title: "Revisa tu correo" });

// Después de pedir el enlace (RC-335): ya no hay código de 4 dígitos, el correo trae un enlace.
export default function ResetEmailSentPage() {
  return (
    <div className="space-y-6">
      <AuthTitle eyebrow={tx("Recuperar acceso · Paso 2 de 3")}>{tx("Revisa tu correo")}</AuthTitle>
      <ResetEmailSent />
    </div>
  );
}
