"use client";

import { SectionError, type SectionErrorProps } from "@/components/dashboard/SectionError";
import { tx } from "@/i18n/tx";

export default function Error(props: SectionErrorProps) {
  return <SectionError {...props} section={tx("el Histórico")} />;
}
