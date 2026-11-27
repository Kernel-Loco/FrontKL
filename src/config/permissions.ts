// Única fuente de verdad para la navegación y los permisos por rol.
// TODO: conectar con backend — FastAPI debe aplicar los mismos permisos en cada
// endpoint; esto solo controla qué ve la interfaz.
import {
  Bell,
  Boxes,
  Globe,
  History,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  ListChecks,
  Radar,
  Scale,
  ScanSearch,
  ScrollText,
  TriangleAlert,
  Users,
  Webhook,
  type LucideIcon,
} from "lucide-react";
import type { Role, User } from "@/types";

export type SectionId =
  | "dashboard"
  | "dominios"
  | "detalle"
  | "activos"
  | "hallazgos"
  | "historico"
  | "plan"
  | "alertas"
  | "admin"
  | "usuarios"
  | "api"
  | "pesos"
  | "fuentes"
  | "webhooks"
  | "bitacora";

export interface SectionConfig {
  id: SectionId;
  label: string;
  href: string;
  icon: LucideIcon;
}

function section(id: SectionId, label: string, href: string, icon: LucideIcon): SectionConfig {
  return { id, label, href, icon };
}

export const SECTIONS: Record<SectionId, SectionConfig> = {
  dashboard: section("dashboard", "Dashboard", "/dashboard", LayoutGrid),
  dominios: section("dominios", "Dominios y autorización", "/dashboard/dominios", Globe),
  detalle: section("detalle", "Detalle de dominio", "/dashboard/detalle", ScanSearch),
  activos: section("activos", "Activos", "/dashboard/activos", Boxes),
  hallazgos: section("hallazgos", "Hallazgos", "/dashboard/hallazgos", TriangleAlert),
  historico: section("historico", "Reportes e histórico", "/dashboard/historico", History),
  plan: section("plan", "Plan de acción", "/dashboard/plan", ListChecks),
  alertas: section("alertas", "Políticas de alerta", "/dashboard/alertas", Bell),
  admin: section("admin", "Resumen", "/dashboard/admin", LayoutDashboard),
  usuarios: section("usuarios", "Usuarios y roles", "/dashboard/admin/usuarios", Users),
  api: section("api", "Acceso API", "/dashboard/admin/api", KeyRound),
  pesos: section("pesos", "Pesos del score", "/dashboard/admin/pesos", Scale),
  fuentes: section("fuentes", "Fuentes", "/dashboard/admin/fuentes", Radar),
  webhooks: section("webhooks", "Webhooks", "/dashboard/admin/webhooks", Webhook),
  bitacora: section("bitacora", "Bitácora", "/dashboard/admin/bitacora", ScrollText),
};

export const ROLE_LABELS: Record<Role, string> = {
  analista: "Analista",
  gerente: "Gerente",
  admin: "Administrador",
};

/** Qué puede hacer cada rol, para mostrarlo en Usuarios y roles. */
export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  analista: "Revisa dominios, hallazgos y su explicación, lanza escaneos y consulta el histórico.",
  gerente: "Consulta el riesgo de los dominios, el detalle y los reportes. Solo lectura.",
  admin: "Todo lo anterior, además de registrar dominios, verificar el TXT, gestionar usuarios, fuentes, llaves de API, webhooks y alertas.",
};

/** Rol asignado a toda cuenta nueva; solo un Admin puede cambiarlo. */
export const DEFAULT_ROLE: Role = "analista";

export interface NavGroup {
  title: string;
  items: SectionId[];
}

/**
 * Menú de cada rol, en el orden en que aparece en la barra lateral. 'Activos' (RC-231) es para los tres: la API da el
 * inventario a todos los roles, como el de cada dominio en su detalle.
 */
export const ROLE_NAVIGATION: Record<Role, NavGroup[]> = {
  analista: [{ title: "Monitoreo", items: ["dashboard", "dominios", "detalle", "activos", "hallazgos", "historico", "plan"] }],
  gerente: [{ title: "Monitoreo", items: ["dashboard", "dominios", "detalle", "activos", "historico", "plan"] }],
  admin: [
    { title: "Monitoreo", items: ["dashboard", "dominios", "activos", "hallazgos", "historico", "plan", "alertas"] },
    { title: "Administración", items: ["admin", "usuarios", "pesos", "fuentes", "api", "webhooks", "bitacora"] },
  ],
};

/**
 * Secciones a las que entra cada rol. Además de su menú, el Admin entra al detalle
 * de dominio desde «Ver» en Dominios y autorización.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly SectionId[]> = {
  analista: ROLE_NAVIGATION.analista.flatMap((g) => g.items),
  gerente: ROLE_NAVIGATION.gerente.flatMap((g) => g.items),
  admin: [...ROLE_NAVIGATION.admin.flatMap((g) => g.items), "detalle"],
};

/** Acciones que no son de una sección completa. */
export type Capability =
  | "register_domain"
  | "verify_txt"
  | "request_scan"
  | "request_report"
  | "ask_assistant"
  | "triage_findings";

/**
 * `ask_assistant` (RC-77): el asistente de IA de Hallazgos. La API lo da solo a Analista y Admin.
 * `triage_findings` (RC-172): marcar un hallazgo como falso positivo, riesgo aceptado o resuelto, o reabrirlo. La API
 * (POST /findings/{id}/triage, RC-133) lo da solo a Analista y Admin.
 */
const CAPABILITIES: Record<Role, readonly Capability[]> = {
  analista: ["request_scan", "request_report", "ask_assistant", "triage_findings"],
  gerente: ["request_report"],
  admin: ["register_domain", "verify_txt", "request_scan", "request_report", "ask_assistant", "triage_findings"],
};

export function canAccessSection(role: Role, id: SectionId): boolean {
  return ROLE_PERMISSIONS[role].includes(id);
}

export function can(role: Role, capability: Capability): boolean {
  return CAPABILITIES[role].includes(capability);
}

/**
 * Superadmin de la plataforma (RC-332): cambia de empresa activa desde la barra lateral. No depende del rol,
 * que en una empresa ajena es Admin. La API vuelve a revisarlo en la base en cada cambio.
 */
export function canSwitchOrganization(user: User | null | undefined): boolean {
  return user?.platform_admin === true;
}

export function getNavigation(role: Role): { title: string; items: SectionConfig[] }[] {
  return ROLE_NAVIGATION[role].map((group) => ({ title: group.title, items: group.items.map((id) => SECTIONS[id]) }));
}

/** Elemento del menú que se marca como activo para una ruta. */
export function isNavItemActive(item: SectionConfig, pathname: string, role: Role): boolean {
  const showsDetail = ROLE_NAVIGATION[role].some((g) => g.items.includes("detalle"));
  const isDomainDetail = pathname.startsWith("/dashboard/dominios/");
  switch (item.id) {
    case "dashboard":
    case "admin":
      return pathname === item.href;
    case "detalle":
      return pathname.startsWith(item.href) || isDomainDetail;
    case "dominios":
      return pathname === item.href || (!showsDetail && isDomainDetail);
    default:
      return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
}
