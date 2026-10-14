import { Inbox } from "lucide-react";

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <Inbox aria-hidden="true" className="h-8 w-8 text-lt-faint" />
      <p className="mt-3 text-sm font-semibold text-lt-text">{title}</p>
      {children && <p className="mt-1 max-w-sm text-xs text-lt-muted">{children}</p>}
    </div>
  );
}
