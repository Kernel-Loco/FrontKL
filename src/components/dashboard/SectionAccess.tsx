import type { ReactElement } from "react";
import { redirect } from "next/navigation";
import { canAccessSection, ROLE_LABELS, SECTIONS, type SectionId } from "@/config/permissions";
import { getServerSession } from "@/lib/session/server";
import type { User } from "@/types";
import { Forbidden } from "./Forbidden";

type SectionAccess = { user: User; forbidden: null } | { user: User; forbidden: ReactElement };

/**
 * Control de acceso de una sección. Se llama al inicio de su página, ANTES de pedir datos,
 * para que un rol sin permiso vea «Acceso denegado» y no un error de la API:
 *
 *   const { user, forbidden } = await checkSectionAccess("hallazgos");
 *   if (forbidden) return forbidden;
 */
export async function checkSectionAccess(id: SectionId): Promise<SectionAccess> {
  const session = await getServerSession();
  if (!session) redirect("/login");
  const { user } = session;
  if (canAccessSection(user.role, id)) return { user, forbidden: null };
  return { user, forbidden: <Forbidden sectionLabel={SECTIONS[id].label} roleLabel={ROLE_LABELS[user.role]} /> };
}
