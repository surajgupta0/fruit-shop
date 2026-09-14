"use client";

/** Compact star row for ratings (1–5). */
export function StarRating({
  value,
  size = "md",
  className = "",
}: {
  value: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(5, value));
  const dim =
    size === "sm" ? "size-3.5" : size === "lg" ? "size-5" : "size-4";

  return (
    <span
      className={`inline-flex items-center gap-0.5 ${className}`}
      aria-label={`${clamped.toFixed(1)} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.min(1, Math.max(0, clamped - (star - 1)));
        return (
          <span key={star} className={`relative ${dim}`}>
            <svg
              viewBox="0 0 20 20"
              className={`${dim} text-[var(--fs-line)]`}
              fill="currentColor"
              aria-hidden
            >
              <path d="M10 1.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.8 4.8 17.5l1-5.8L1.6 7.6l5.8-.8L10 1.5z" />
            </svg>
            {fill > 0 && (
              <span
                className="absolute inset-0 overflow-hidden text-[var(--fs-accent)]"
                style={{ width: `${fill * 100}%` }}
              >
                <svg viewBox="0 0 20 20" className={dim} fill="currentColor" aria-hidden>
                  <path d="M10 1.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.8 4.8 17.5l1-5.8L1.6 7.6l5.8-.8L10 1.5z" />
                </svg>
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

export function StarPicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={active && star === value}
            disabled={disabled}
            onClick={() => onChange(star)}
            className={`rounded-lg p-1 transition hover:bg-[var(--fs-mist)] disabled:opacity-50 ${
              active ? "text-[var(--fs-accent)]" : "text-[var(--fs-line)]"
            }`}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
          >
            <svg viewBox="0 0 20 20" className="size-7" fill="currentColor" aria-hidden>
              <path d="M10 1.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.8 4.8 17.5l1-5.8L1.6 7.6l5.8-.8L10 1.5z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
