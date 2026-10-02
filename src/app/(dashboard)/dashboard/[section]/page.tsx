import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Forbidden } from "@/components/dashboard/Forbidden";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { UnderConstruction } from "@/components/dashboard/UnderConstruction";
import { canAccessSection, findSectionBySlug, ROLE_LABELS } from "@/config/permissions";
import { getServerSession } from "@/lib/session/server";

type SectionPageProps = { params: Promise<{ section: string }> };

export async function generateMetadata({ params }: SectionPageProps): Promise<Metadata> {
  const { section } = await params;
  return { title: findSectionBySlug(section)?.label ?? "No encontrado" };
}

export default async function SectionPage({ params }: SectionPageProps) {
  const { section: slug } = await params;
  const section = findSectionBySlug(slug);
  if (!section || !slug) notFound();

  const session = await getServerSession();
  if (!session) redirect("/login");

  if (!canAccessSection(session.user.role, section.id)) {
    return <Forbidden sectionLabel={section.label} roleLabel={ROLE_LABELS[session.user.role]} />;
  }

  return (
    <div className="space-y-8">
      <PageHeader title={section.label} />
      <UnderConstruction />
    </div>
  );
}
