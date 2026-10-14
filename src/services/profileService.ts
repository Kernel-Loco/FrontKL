// Perfil de quien tiene la sesión. Solo desde el servidor: lee la sesión validada por FastAPI.
import { getServerSession } from "@/lib/session/server";
import type { User } from "@/types";
import { ServiceError } from "./errors";

export async function getMyProfile(): Promise<User> {
  const session = await getServerSession();
  if (!session) throw new ServiceError("unauthorized", "Tu sesión terminó. Vuelve a iniciar sesión.");
  return session.user;
}
