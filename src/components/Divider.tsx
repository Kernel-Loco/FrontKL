export function Divider({ label = "o" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3" role="separator" aria-label={label}>
      <span className="h-px flex-1 bg-lt-line" />
      <span className="text-xs text-slate-500" aria-hidden="true">
        {label}
      </span>
      <span className="h-px flex-1 bg-lt-line" />
    </div>
  );
}
