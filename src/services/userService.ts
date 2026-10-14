// Usuarios de la organización (provisional: aún no está en el contrato #21). Solo Admin.
// Se usa desde el servidor (lista) y desde componentes de cliente (invitar, cambiar rol).
import { mockDelay } from "@/lib/mock";
import { mockUsers } from "@/mocks/api/provisional";
import type { InviteRequest, ListResponse, OrgUser, Role } from "@/types";
import { ServiceError } from "./errors";

export async function getUsers(): Promise<ListResponse<OrgUser>> {
  // TODO: conectar con backend → GET /users
  await mockDelay(300);
  return structuredClone(mockUsers);
}

export async function inviteUser(request: InviteRequest): Promise<OrgUser> {
  // TODO: conectar con backend → POST /users/invitations
  await mockDelay(600);
  if (mockUsers.items.some((u) => u.email === request.email)) {
    throw new ServiceError("duplicate", "Ya existe un usuario con ese correo.");
  }
  return { id: `u-${Date.now()}`, ...request, mfa_enabled: false, is_active: false, last_login_at: null };
}

export async function changeUserRole(userId: string, role: Role): Promise<OrgUser> {
  // TODO: conectar con backend → PATCH /users/{id} { role }
  await mockDelay(400);
  const user = mockUsers.items.find((u) => u.id === userId);
  if (!user) throw new ServiceError("not_found", "Usuario no encontrado.");
  return { ...structuredClone(user), role };
}
