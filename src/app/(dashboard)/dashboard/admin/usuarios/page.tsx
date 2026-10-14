import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { checkSectionAccess } from "@/components/dashboard/SectionAccess";
import { UsersManager } from "@/components/screens/admin/UsersManager";
import { SECTIONS } from "@/config/permissions";
import { getUsers } from "@/services/userService";

export const metadata: Metadata = { title: SECTIONS.usuarios.label };

export default async function UsuariosPage() {
  const { user, forbidden } = await checkSectionAccess("usuarios");
  if (forbidden) return forbidden;

  return (
    <div className="space-y-8">
      <PageHeader title={SECTIONS.usuarios.label} description="Quién entra a Lowtide y qué puede hacer cada rol." />
      <UsersManager initial={(await getUsers()).items} currentUserEmail={user.email} />
    </div>
  );
}
