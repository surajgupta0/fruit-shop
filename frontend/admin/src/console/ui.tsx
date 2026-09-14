import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import Link from "next/link";

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
        <h1 className="text-[1.75rem] font-extrabold leading-tight tracking-tight text-[var(--fs-ink)] sm:text-[2rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-xl text-sm font-medium leading-relaxed text-[var(--fs-muted)]">
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
    <h2 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--fs-muted)]">
      {children}
    </h2>
  );
}

export function StatCard({
  label,
  value,
  hint,
  href,
  loading,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  loading?: boolean;
  tone?: "neutral" | "ok" | "warn" | "danger";
}) {
  const toneBorder =
    tone === "danger"
      ? "border-rose-200"
      : tone === "warn"
        ? "border-amber-200"
        : tone === "ok"
          ? "border-[var(--fs-accent)]/30"
          : "border-[var(--fs-line)]";

  const body = loading ? (
    <div className="space-y-3" aria-hidden>
      <div className="fs-skeleton h-2.5 w-20" />
      <div className="fs-skeleton h-8 w-14" />
      <div className="fs-skeleton h-2 w-28" />
    </div>
  ) : (
    <>
      <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--fs-muted)]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--fs-ink)]">{value}</p>
      {hint ? <p className="mt-1 text-xs font-medium leading-snug text-[var(--fs-muted)]">{hint}</p> : null}
    </>
  );

  const className = `block rounded-[var(--fs-radius)] border bg-white p-4 shadow-[var(--fs-shadow-sm)] ${toneBorder} ${
    href && !loading ? "transition hover:border-[var(--fs-accent)]/40" : ""
  }`;

  if (href && !loading) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }
  return (
    <div className={className} aria-busy={loading || undefined}>
      {body}
    </div>
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
    ok: "bg-[var(--fs-mist)] text-[var(--fs-accent-deep)] ring-[var(--fs-accent)]/20",
    warn: "bg-[var(--fs-warn-bg)] text-[var(--fs-warn)] ring-[var(--fs-warn)]/25",
    neutral: "bg-stone-100 text-stone-600 ring-stone-200",
    danger: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide ring-1 ring-inset ${tones[tone]}`}
    >
      <span
        className={`size-1.5 rounded-full ${
          tone === "ok"
            ? "bg-[var(--fs-accent)]"
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
      "bg-gradient-to-br from-[var(--fs-mango)] to-[var(--fs-accent)] text-white shadow-sm hover:brightness-105 disabled:opacity-55",
    secondary:
      "border border-[var(--fs-line)] bg-[var(--fs-surface)] text-[var(--fs-ink)] hover:bg-[var(--fs-mist)] disabled:opacity-55",
    ghost: "text-[var(--fs-muted)] hover:bg-black/5 hover:text-[var(--fs-ink)] disabled:opacity-55",
    danger:
      "border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 disabled:opacity-55",
  };
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-sm font-bold transition disabled:cursor-not-allowed ${styles[variant]} ${className}`}
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
      <span className="font-bold text-[var(--fs-ink)]">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint ? <span className="mt-1 block text-xs font-medium text-[var(--fs-muted)]">{hint}</span> : null}
    </label>
  );
}

const controlClass =
  "w-full rounded-xl border border-[var(--fs-line)] bg-[var(--fs-surface)] px-3 py-2.5 text-sm font-medium text-[var(--fs-ink)] outline-none transition placeholder:text-stone-400 focus:border-[var(--fs-accent)] focus:ring-2 focus:ring-[var(--fs-accent)]/15";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${controlClass} ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${controlClass} ${className}`} {...props} />;
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="text-base font-extrabold text-[var(--fs-ink)]">{title}</p>
      {body ? <p className="mx-auto mt-1.5 max-w-sm text-sm font-medium text-[var(--fs-muted)]">{body}</p> : null}
    </div>
  );
}

export function Spinner({ className = "size-5" }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-[var(--fs-mist)] border-t-[var(--fs-accent)] ${className}`}
      aria-hidden
    />
  );
}

export function LoadingLine({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center gap-3 px-6 py-12"
      role="status"
      aria-live="polite"
    >
      <Spinner />
      <p className="text-sm font-semibold text-[var(--fs-muted)]">{label}</p>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-0 divide-y divide-[var(--fs-line)]" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4 sm:px-5">
          <div className="fs-skeleton h-4 w-1/4" />
          <div className="fs-skeleton h-4 w-1/5" />
          <div className="fs-skeleton ml-auto h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export function PageLoader({
  title = "Loading console",
  detail = "Fetching the latest data…",
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
      <p className="mt-5 text-xl font-extrabold tracking-tight text-[var(--fs-ink)]">{title}</p>
      <p className="mt-2 text-sm font-medium leading-relaxed text-[var(--fs-muted)]">{detail}</p>
      <div className="mt-8 grid w-full gap-2">
        <div className="fs-skeleton h-2.5 w-full !rounded-full" />
        <div className="fs-skeleton mx-auto h-2.5 w-4/5 !rounded-full" />
        <div className="fs-skeleton mx-auto h-2.5 w-3/5 !rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-[var(--fs-radius)] border border-[var(--fs-line)] bg-white shadow-[var(--fs-shadow-sm)] ${className}`}
      aria-hidden
    >
      <div className="space-y-3 p-4">
        <div className="fs-skeleton h-2.5 w-24" />
        <div className="fs-skeleton h-8 w-16" />
        <div className="fs-skeleton h-2 w-32" />
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
    danger: "border-[var(--fs-danger)]/25 bg-[var(--fs-danger-bg)] text-[var(--fs-danger)]",
    info: "border-[var(--fs-accent)]/25 bg-[var(--fs-mist)] text-[var(--fs-accent-deep)]",
    neutral: "border-[var(--fs-line)] bg-white text-[var(--fs-ink)]",
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
          <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] opacity-80">
            {labels[tone]}
          </span>
          <p className="text-sm font-extrabold text-current">{title}</p>
        </div>
        {children ? (
          <div className="mt-1 text-sm font-medium leading-relaxed opacity-90 [&_a]:font-bold [&_a]:underline">
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

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-2 rounded-[var(--fs-radius)] border border-[var(--fs-line)] bg-white p-3 shadow-[var(--fs-shadow-sm)] sm:flex-row sm:items-center">
      {children}
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-[var(--fs-mist)]/70 text-left text-[11px] font-extrabold uppercase tracking-wide text-[var(--fs-muted)]">
      {children}
    </thead>
  );
}

/** Soft orange auth shell for login / forgot / reset / signup. */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[var(--fs-canvas)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_480px_at_10%_-10%,rgba(251,146,60,0.28),transparent),radial-gradient(700px_400px_at_90%_0%,rgba(249,115,22,0.12),transparent)]"
      />
      <div
        aria-hidden
        className="fs-drift pointer-events-none absolute -left-16 bottom-10 h-56 w-56 rounded-full bg-[var(--fs-mango)]/20 blur-2xl"
      />
      <div
        aria-hidden
        className="fs-drift pointer-events-none absolute -right-10 top-24 h-72 w-72 rounded-full bg-[var(--fs-accent)]/10 blur-3xl"
        style={{ animationDelay: "1.5s" }}
      />

      <main className="relative z-10 mx-auto grid min-h-dvh max-w-6xl items-center gap-10 px-6 py-12 lg:grid-cols-2">
        <section className="fs-rise">
          <div className="flex items-center gap-3">
            <span className="fs-brand-mark grid size-11 place-items-center rounded-2xl">
              <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
                <path
                  d="M12 3c.4 1.6 1.4 2.6 3 3-1.2.2-2.2.8-2.8 1.8C11.4 6.8 10.2 5.6 8.5 5c1.5-.2 2.8-1 3.5-2z"
                  opacity=".9"
                />
                <ellipse cx="12" cy="14.5" rx="6.5" ry="7" />
              </svg>
            </span>
            <p className="text-2xl font-extrabold tracking-tight text-[var(--fs-ink)]">Fruit Shop</p>
          </div>
          <h1 className="mt-6 max-w-md text-3xl font-extrabold tracking-tight text-[var(--fs-ink)] sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-sm text-sm font-medium leading-relaxed text-[var(--fs-muted)]">
            {subtitle}
          </p>
        </section>

        <section className="fs-rise-delay mx-auto w-full max-w-md">{children}</section>
      </main>
    </div>
  );
}
