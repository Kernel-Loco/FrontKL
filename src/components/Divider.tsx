export function Divider({ label = "Or" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2.5" role="separator" aria-label={label}>
      <span className="h-px flex-1 bg-white/90" />
      <span className="text-xs text-white" aria-hidden="true">
        {label}
      </span>
      <span className="h-px flex-1 bg-white/90" />
    </div>
  );
}
