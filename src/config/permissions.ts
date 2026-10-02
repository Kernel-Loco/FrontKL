// Única fuente de verdad para la navegación y los permisos por rol.
// TODO: conectar con backend — FastAPI debe aplicar los mismos permisos en cada
// endpoint; esto solo controla qué ve la interfaz.
import {
  FileText,
  Gauge,
  LayoutDashboard,
  Radar,
  Server,
  Settings,
  ShieldAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/types";

export type SectionId =
  | "resumen"
  | "activos"
  | "hallazgos"
  | "escaneos"
  | "score"
  | "reportes"
  | "usuarios"
  | "configuracion";

export interface SectionConfig {
  id: SectionId;
  label: string;
  /** Segmento de URL bajo /dashboard ("" para la vista principal). */
  slug: string;
  href: string;
  icon: LucideIcon;
}

function section(id: SectionId, label: string, slug: string, icon: LucideIcon): SectionConfig {
  return { id, label, slug, href: slug ? `/dashboard/${slug}` : "/dashboard", icon };
}

export const SECTIONS: Record<SectionId, SectionConfig> = {
  resumen: section("resumen", "Resumen", "", LayoutDashboard),
  activos: section("activos", "Activos", "activos", Server),
  hallazgos: section("hallazgos", "Hallazgos", "hallazgos", ShieldAlert),
  escaneos: section("escaneos", "Escaneos OSINT", "escaneos", Radar),
  score: section("score", "Score de riesgo", "score-de-riesgo", Gauge),
  reportes: section("reportes", "Reportes", "reportes", FileText),
  usuarios: section("usuarios", "Usuarios", "usuarios", Users),
  configuracion: section("configuracion", "Configuración", "configuracion", Settings),
};

export const ROLE_LABELS: Record<Role, string> = {
  analista: "Analista",
  gerente: "Gerente",
  admin: "Admin",
};

/** Rol asignado a toda cuenta nueva; solo un Admin puede cambiarlo. */
export const DEFAULT_ROLE: Role = "analista";

const ANALISTA: SectionId[] = ["resumen", "activos", "hallazgos", "escaneos"];
const GERENTE: SectionId[] = ["resumen", "score", "reportes"];

/** Secciones permitidas por rol, en el orden en que aparecen en la barra lateral. */
export const ROLE_PERMISSIONS: Record<Role, readonly SectionId[]> = {
  analista: ANALISTA,
  gerente: GERENTE,
  admin: [...new Set([...ANALISTA, ...GERENTE]), "usuarios", "configuracion"],
};

export function canAccessSection(role: Role, id: SectionId): boolean {
  return ROLE_PERMISSIONS[role].includes(id);
}

export function getNavigation(role: Role): SectionConfig[] {
  return ROLE_PERMISSIONS[role].map((id) => SECTIONS[id]);
}

export function findSectionBySlug(slug: string): SectionConfig | undefined {
  return Object.values(SECTIONS).find((s) => s.slug === slug);
}
