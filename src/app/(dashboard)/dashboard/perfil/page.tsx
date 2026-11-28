import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ChangePasswordForm } from "@/components/screens/perfil/ChangePasswordForm";
import { MfaSetupCard } from "@/components/screens/perfil/MfaSetup";
import { LanguageSection } from "@/components/screens/perfil/LanguageSection";
import { PasskeysSection } from "@/components/screens/perfil/PasskeysSection";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/config/permissions";
import { formatDateTime } from "@/lib/format";
import { getMyProfile } from "@/services/profileService";
import { tx, localized } from "@/i18n/tx";

export const metadata: Metadata = localized({ title: "Mi perfil" });

// Cualquier rol con sesión entra (el layout del dashboard ya exige la sesión).
export default async function PerfilPage() {
  const profile = await getMyProfile();

  return (
    <div className="space-y-8">
      <PageHeader title={tx("Mi perfil")} description={tx("Tus datos de acceso a LowTide.")} />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card title={tx("Cuenta")}>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-xs text-lt-muted">{tx("Nombre")}</dt>
              <dd className="mt-0.5 text-lt-text">{profile.full_name}</dd>
            </div>
            <div>
              <dt className="text-xs text-lt-muted">{tx("Correo")}</dt>
              <dd className="mt-0.5 text-lt-text">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-lt-muted">{tx("Rol")}</dt>
              <dd className="mt-1">
                <Badge tone="indigo">{ROLE_LABELS[profile.role]}</Badge>
                <p className="mt-1.5 text-xs text-lt-muted">{ROLE_DESCRIPTIONS[profile.role]}</p>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-lt-muted">{tx("Verificación en dos pasos")}</dt>
              <dd className="mt-1">{profile.mfa_enabled ? <Badge tone="teal" dot>{tx("Activa")}</Badge> : <Badge tone="amber" dot>{tx("Pendiente")}</Badge>}</dd>
            </div>
            {profile.last_login_at && (
              <div>
                <dt className="text-xs text-lt-muted">{tx("Último acceso")}</dt>
                <dd className="mt-0.5 text-lt-text">{formatDateTime(profile.last_login_at)}</dd>
              </div>
            )}
          </dl>
        </Card>
        <Card title={tx("Cambiar contraseña")}>
          <ChangePasswordForm />
        </Card>
        <Card title={tx("Passkeys")}>
          {/* La key la vuelve a montar al activar TOTP: la lista se pide otra vez sin las passkeys borradas. */}
          <PasskeysSection key={String(profile.mfa_enabled)} mfaEnabled={profile.mfa_enabled} />
        </Card>
        <MfaSetupCard mfaEnabled={profile.mfa_enabled} />
        <Card title={tx("Idioma")}>
          <LanguageSection />
        </Card>
      </div>
    </div>
  );
}
