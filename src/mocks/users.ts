// Usuarios de prueba. Solo existen en memoria del navegador: las cuentas creadas
// en /signup se pierden al recargar la página.
import type { User } from "@/types";

export const MOCK_PASSWORD = "Cirdan1234";
export const MOCK_MFA_CODE = "123456";
export const MOCK_RESET_CODE = "1234";

export interface MockAccount {
  user: User;
  password: string;
}

export const mockAccounts: MockAccount[] = [
  {
    user: { id: "u-001", username: "analista", full_name: "Ana Torres", email: "analista@cirdan.test", role: "analista" },
    password: MOCK_PASSWORD,
  },
  {
    user: { id: "u-002", username: "gerente", full_name: "Gabriel Méndez", email: "gerente@cirdan.test", role: "gerente" },
    password: MOCK_PASSWORD,
  },
  {
    user: { id: "u-003", username: "admin", full_name: "Alex Ramírez", email: "admin@cirdan.test", role: "admin" },
    password: MOCK_PASSWORD,
  },
];
