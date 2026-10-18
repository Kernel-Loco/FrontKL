import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ChangePasswordForm } from "@/components/screens/perfil/ChangePasswordForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/config/permissions";
import { formatDateTime } from "@/lib/format";
import { getMyProfile } from "@/services/profileService";

export const metadata: Metadata = { title: "Mi perfil" };

// Cualquier rol con sesión entra (el layout del dashboard ya exige la sesión).
export default async function PerfilPage() {
  const profile = await getMyProfile();

  return (
    <div className="space-y-8">
      <PageHeader title="Mi perfil" description="Tus datos de acceso a Lowtide." />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card title="Cuenta">
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-xs text-lt-muted">Nombre</dt>
              <dd className="mt-0.5 text-lt-text">{profile.full_name}</dd>
            </div>
            <div>
              <dt className="text-xs text-lt-muted">Correo</dt>
              <dd className="mt-0.5 text-lt-text">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-lt-muted">Rol</dt>
              <dd className="mt-1">
                <Badge tone="indigo">{ROLE_LABELS[profile.role]}</Badge>
                <p className="mt-1.5 text-xs text-lt-muted">{ROLE_DESCRIPTIONS[profile.role]}</p>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-lt-muted">Verificación en dos pasos</dt>
              <dd className="mt-1">{profile.mfa_enabled ? <Badge tone="teal" dot>Activa</Badge> : <Badge tone="amber" dot>Pendiente</Badge>}</dd>
            </div>
            {profile.last_login_at && (
              <div>
                <dt className="text-xs text-lt-muted">Último acceso</dt>
                <dd className="mt-0.5 text-lt-text">{formatDateTime(profile.last_login_at)}</dd>
              </div>
            )}
          </dl>
        </Card>
        <Card title="Cambiar contraseña">
          <ChangePasswordForm />
        </Card>
      </div>
    </div>
  );
}
