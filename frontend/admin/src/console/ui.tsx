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

export function LoadingLine({ label = "Loading…" }: { label?: string }) {
  return <p className="px-6 py-8 text-sm text-[var(--fs-muted)]">{label}</p>;
}

export function ErrorLine({ message }: { message: string }) {
  return <p className="px-6 py-8 text-sm text-rose-600">{message}</p>;
}
