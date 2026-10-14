import { ProgressBar } from "@/components/ui/ProgressBar";
import { BAND_TONE } from "@/components/ui/tones";
import { CATEGORY_LABELS } from "@/config/labels";
import type { CategoryScore } from "@/types";

export function CategoryBars({ categories }: { categories: CategoryScore[] }) {
  return (
    <ul className="space-y-4">
      {categories.map((c) => (
        <li key={c.category}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="text-lt-text">{CATEGORY_LABELS[c.category]}</span>
            <span className="text-xs text-lt-muted">
              peso {Math.round(c.weight * 100)} % · <strong className="font-semibold text-white">{c.score}</strong>
            </span>
          </div>
          <ProgressBar value={c.score} tone={BAND_TONE[c.band]} label={`${CATEGORY_LABELS[c.category]}: ${c.score} de 100`} className="h-2" />
        </li>
      ))}
    </ul>
  );
}
