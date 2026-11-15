"use client";

import { SectionError, type SectionErrorProps } from "@/components/dashboard/SectionError";

export default function Error(props: SectionErrorProps) {
  return <SectionError {...props} section="el Perfil" />;
}
