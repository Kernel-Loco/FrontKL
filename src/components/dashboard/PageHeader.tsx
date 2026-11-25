import type { ReactNode } from "react";
import { Breadcrumb, type Crumb } from "../ui/Breadcrumb";

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  breadcrumb?: Crumb[];
  /** Botones a la derecha del título. */
  actions?: ReactNode;
}

export function PageHeader({ title, description, breadcrumb, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0 sm:flex-1">
        {breadcrumb && <Breadcrumb items={breadcrumb} />}
        <h1 className="text-2xl font-bold tracking-tight text-lt-text sm:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-lt-muted">{description}</p>}
      </div>
      {actions && <div className="flex min-w-0 max-w-full flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
