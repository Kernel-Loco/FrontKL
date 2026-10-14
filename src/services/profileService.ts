// Perfil de quien tiene la sesión (provisional: aún no está en el contrato #21).
// Solo desde el servidor: lee la sesión con cookies().
import { getServerSession } from "@/lib/session/server";
import { mockDelay } from "@/lib/mock";
import { mockUsers } from "@/mocks/api/provisional";
import type { OrgUser } from "@/types";
import { ServiceError } from "./errors";

export async function getMyProfile(): Promise<OrgUser> {
  // TODO: conectar con backend → GET /me (reenviando la cookie de sesión)
  await mockDelay(200);
  const session = await getServerSession();
  if (!session) throw new ServiceError("unauthorized", "Tu sesión terminó. Vuelve a iniciar sesión.");
  const { user } = session;
  const known = mockUsers.items.find((u) => u.email === user.email);
  return known
    ? structuredClone(known)
    : { id: user.id, full_name: user.full_name, email: user.email, role: user.role, mfa_enabled: true, is_active: true, last_login_at: null };
}
