import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
}) {
  return (
    <div className="fs-rise mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {breadcrumb}
        <h1 className="font-[family-name:var(--font-fraunces)] text-[1.75rem] leading-tight tracking-tight text-[var(--fs-ink)] sm:text-[2rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[var(--fs-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Surface({
  children,
  className = "",
  padded = false,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[var(--fs-radius)] border border-[var(--fs-line)] bg-[var(--fs-surface)] shadow-[var(--fs-shadow-sm)] ${
        padded ? "p-5 sm:p-6" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--fs-muted)]">
      {children}
    </h2>
  );
}

export function StatusPill({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "neutral" | "danger";
  children: ReactNode;
}) {
  const tones = {
    ok: "bg-[var(--fs-ok-bg)] text-[var(--fs-ok)] ring-[var(--fs-ok)]/20",
    warn: "bg-[var(--fs-warn-bg)] text-[var(--fs-warn)] ring-[var(--fs-warn)]/25",
    neutral: "bg-stone-100 text-stone-600 ring-stone-200",
    danger: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}
    >
      <span
        className={`size-1.5 rounded-full ${
          tone === "ok"
            ? "bg-[var(--fs-ok)]"
            : tone === "warn"
              ? "bg-[var(--fs-warn)]"
              : tone === "danger"
                ? "bg-rose-500"
                : "bg-stone-400"
        }`}
      />
      {children}
    </span>
  );
}

export function Btn({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const styles = {
    primary:
      "bg-[var(--fs-leaf-deep)] text-white hover:bg-[var(--fs-leaf)] shadow-sm disabled:opacity-55",
    secondary:
      "border border-[var(--fs-line)] bg-[var(--fs-surface)] text-[var(--fs-ink)] hover:bg-[var(--fs-mist)] disabled:opacity-55",
    ghost: "text-[var(--fs-muted)] hover:bg-black/5 hover:text-[var(--fs-ink)] disabled:opacity-55",
    danger:
      "border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 disabled:opacity-55",
  };
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    />
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-stone-700">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint ? <span className="mt-1 block text-xs text-[var(--fs-muted)]">{hint}</span> : null}
    </label>
  );
}

const controlClass =
  "w-full rounded-xl border border-[var(--fs-line)] bg-[var(--fs-surface)] px-3 py-2.5 text-sm text-[var(--fs-ink)] outline-none transition placeholder:text-stone-400 focus:border-[var(--fs-leaf)] focus:ring-2 focus:ring-[var(--fs-leaf)]/15";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${controlClass} ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${controlClass} ${className}`} {...props} />;
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="font-medium text-[var(--fs-ink)]">{title}</p>
      {body ? <p className="mt-1 text-sm text-[var(--fs-muted)]">{body}</p> : null}
    </div>
  );
}

export function Spinner({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin text-[var(--fs-leaf)] ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V1C5.373 1 1 5.373 1 12h3zm2 5.291A7.962 7.962 0 014 12H1c0 3.042 1.135 5.824 3 7.938l2-1.647z"
      />
    </svg>
  );
}

export function LoadingLine({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center gap-3 px-6 py-10"
      role="status"
      aria-live="polite"
    >
      <Spinner />
      <p className="text-sm text-[var(--fs-muted)]">{label}</p>
    </div>
  );
}

export function PageLoader({
  title = "Preparing overview",
  detail = "Pulling live orders, stock, and store signals…",
}: {
  title?: string;
  detail?: string;
}) {
  return (
    <div
      className="mx-auto flex max-w-md flex-col items-center justify-center px-6 py-20 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="flex size-14 items-center justify-center rounded-2xl border border-[var(--fs-line)] bg-white shadow-[var(--fs-shadow-sm)]">
        <Spinner className="size-6" />
      </div>
      <p className="mt-5 font-[family-name:var(--font-fraunces)] text-xl tracking-tight text-[var(--fs-ink)]">
        {title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--fs-muted)]">{detail}</p>
      <div className="mt-8 grid w-full gap-2">
        <div className="h-2.5 animate-pulse rounded-full bg-[var(--fs-mist)]" />
        <div className="mx-auto h-2.5 w-4/5 animate-pulse rounded-full bg-[var(--fs-mist)]" />
        <div className="mx-auto h-2.5 w-3/5 animate-pulse rounded-full bg-[var(--fs-mist)]" />
      </div>
    </div>
  );
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[var(--fs-radius)] border border-[var(--fs-line)] bg-white shadow-[var(--fs-shadow-sm)] ${className}`}
      aria-hidden
    >
      <div className="space-y-3 p-4">
        <div className="h-2.5 w-24 rounded-full bg-[var(--fs-mist)]" />
        <div className="h-8 w-16 rounded-md bg-[var(--fs-mist)]" />
        <div className="h-2 w-32 rounded-full bg-[var(--fs-mist)]" />
      </div>
    </div>
  );
}

export function AlertBanner({
  tone = "neutral",
  title,
  children,
  action,
}: {
  tone?: "ok" | "warn" | "danger" | "neutral" | "info";
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const styles = {
    ok: "border-[var(--fs-ok)]/25 bg-[var(--fs-ok-bg)] text-[var(--fs-ok)]",
    warn: "border-[var(--fs-warn)]/30 bg-[var(--fs-warn-bg)] text-[var(--fs-warn)]",
    danger: "border-rose-200 bg-rose-50 text-rose-800",
    info: "border-[var(--fs-leaf)]/25 bg-[var(--fs-leaf)]/5 text-[var(--fs-leaf-deep)]",
    neutral: "border-[var(--fs-line)] bg-[var(--fs-mist)]/50 text-[var(--fs-ink)]",
  };
  const labels = {
    ok: "All clear",
    warn: "Attention",
    danger: "Action needed",
    info: "Note",
    neutral: "Update",
  };

  return (
    <div
      role="status"
      className={`flex flex-col gap-3 rounded-[var(--fs-radius)] border px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4 ${styles[tone]}`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-80">
            {labels[tone]}
          </span>
          <p className="text-sm font-semibold text-current">{title}</p>
        </div>
        {children ? (
          <div className="mt-1 text-sm leading-relaxed opacity-90 [&_a]:font-semibold [&_a]:underline">
            {children}
          </div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function ErrorLine({ message }: { message: string }) {
  return (
    <div className="px-4 py-6 sm:px-6">
      <AlertBanner tone="danger" title="Couldn’t load this section">
        {message}
      </AlertBanner>
    </div>
  );
}
