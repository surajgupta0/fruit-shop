"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useMutation } from "@fruitshop/web-core";

import { isValidEmail, normalizeEmail } from "@/src/lib/email";
import { formatPhoneDisplay, isValidPhone, normalizePhone } from "@/src/lib/phone";

type Mode = "login" | "signup";
type Channel = "phone" | "email";

type Props = {
  mode: Mode;
};

const RESEND_SECONDS = 30;

const inputClass =
  "w-full rounded-xl border border-[var(--fs-line)] bg-white px-3.5 py-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-[var(--fs-accent)] focus:ring-2 focus:ring-[var(--fs-accent)]/20";

export function CustomerAuthForm({ mode }: Props) {
  const {
    requestOtp,
    verifyOtp,
    requestEmailOtp,
    verifyEmailOtp,
    isAuthenticated,
    bootstrapping,
  } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/account";

  const [channel, setChannel] = useState<Channel>("phone");
  const [step, setStep] = useState<"identifier" | "otp">("identifier");
  const [phone, setPhone] = useState("+91");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [resendIn, setResendIn] = useState(0);

  const phoneSendMutation = useMutation(async (p: string) => requestOtp(p));
  const phoneVerifyMutation = useMutation(async (p: string, c: string, n?: string) =>
    verifyOtp(p, c, n),
  );
  const emailSendMutation = useMutation(async (e: string) => requestEmailOtp(e));
  const emailVerifyMutation = useMutation(async (e: string, c: string, n?: string) =>
    verifyEmailOtp(e, c, n),
  );

  const sending = phoneSendMutation.isLoading || emailSendMutation.isLoading;
  const verifying = phoneVerifyMutation.isLoading || emailVerifyMutation.isLoading;

  useEffect(() => {
    if (!bootstrapping && isAuthenticated) router.replace(next);
  }, [bootstrapping, isAuthenticated, next, router]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  function switchChannel(nextChannel: Channel) {
    setChannel(nextChannel);
    setFieldError("");
    setStep("identifier");
    setCode("");
  }

  async function sendCode() {
    if (channel === "phone") {
      const normalized = normalizePhone(phone);
      await phoneSendMutation.mutate(normalized);
      setPhone(normalized);
    } else {
      const normalized = normalizeEmail(email);
      await emailSendMutation.mutate(normalized);
      setEmail(normalized);
    }
    setStep("otp");
    setResendIn(RESEND_SECONDS);
  }

  async function onSendOtp(event: FormEvent) {
    event.preventDefault();
    setFieldError("");

    if (channel === "phone") {
      if (!isValidPhone(phone)) {
        setFieldError("Enter a valid mobile number (10 digits or +91…).");
        return;
      }
    } else if (!isValidEmail(email)) {
      setFieldError("Enter a valid email address.");
      return;
    }

    try {
      await sendCode();
    } catch {
      /* toast */
    }
  }

  async function onResend() {
    if (resendIn > 0 || sending) return;
    try {
      await sendCode();
    } catch {
      /* toast */
    }
  }

  async function onVerify(event: FormEvent) {
    event.preventDefault();
    try {
      if (channel === "phone") {
        await phoneVerifyMutation.mutate(
          normalizePhone(phone),
          code.trim(),
          isSignup ? name.trim() : undefined,
        );
      } else {
        await emailVerifyMutation.mutate(
          normalizeEmail(email),
          code.trim(),
          isSignup ? name.trim() : undefined,
        );
      }
      router.replace(next);
    } catch {
      /* toast */
    }
  }

  const isSignup = mode === "signup";
  const destinationLabel =
    channel === "phone" ? formatPhoneDisplay(phone) : normalizeEmail(email);
  const qs = search.toString() ? `?${search.toString()}` : "";

  if (bootstrapping) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[var(--fs-canvas)] px-4">
        <div className="w-full max-w-sm rounded-2xl border border-[var(--fs-line)] bg-white p-8 text-center shadow-[var(--fs-shadow-sm)]">
          <span className="mx-auto block size-5 animate-spin rounded-full border-2 border-[var(--fs-mist)] border-t-[var(--fs-accent)]" />
          <p className="mt-4 text-sm font-bold text-[var(--fs-muted)]">Checking session…</p>
          <div className="mt-6 space-y-2">
            <div className="fs-skeleton mx-auto h-10 w-full !rounded-xl" />
            <div className="fs-skeleton mx-auto h-10 w-full !rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[var(--fs-canvas)]">
      {/* Soft top wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-[var(--fs-mist)] to-transparent"
      />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10 sm:px-6">
        {/* Brand */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="fs-brand-mark grid size-11 place-items-center rounded-2xl text-white">
              <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
                <path
                  d="M12 3c.4 1.6 1.4 2.6 3 3-1.2.2-2.2.8-2.8 1.8C11.4 6.8 10.2 5.6 8.5 5c1.5-.2 2.8-1 3.5-2z"
                  opacity=".9"
                />
                <ellipse cx="12" cy="14.5" rx="6.5" ry="7" />
              </svg>
            </span>
            <span className="text-xl font-extrabold tracking-tight text-[var(--fs-ink)]">
              Fruit Shop
            </span>
          </Link>
        </div>

        {/* Auth card */}
        <div className="rounded-3xl border border-[var(--fs-line)] bg-white p-6 shadow-[var(--fs-shadow-sm)] sm:p-8">
          {step === "identifier" ? (
            <form onSubmit={onSendOtp} noValidate>
              <h1 className="text-2xl font-extrabold tracking-tight text-[var(--fs-ink)]">
                {isSignup ? "Create account" : "Sign in"}
              </h1>
              <p className="mt-1.5 text-sm font-medium text-[var(--fs-muted)]">
                {isSignup
                  ? "Verify with mobile or email — no password needed."
                  : "Use your mobile or email. We’ll send a one-time code."}
              </p>

              {/* Method tabs */}
              <div
                className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-[var(--fs-mist)] p-1"
                role="tablist"
                aria-label="Sign-in method"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={channel === "phone"}
                  className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                    channel === "phone"
                      ? "bg-white text-[var(--fs-ink)] shadow-sm"
                      : "text-[var(--fs-muted)] hover:text-[var(--fs-ink)]"
                  }`}
                  onClick={() => switchChannel("phone")}
                >
                  Mobile
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={channel === "email"}
                  className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                    channel === "email"
                      ? "bg-white text-[var(--fs-ink)] shadow-sm"
                      : "text-[var(--fs-muted)] hover:text-[var(--fs-ink)]"
                  }`}
                  onClick={() => switchChannel("email")}
                >
                  Email
                </button>
              </div>

              {isSignup && (
                <label className="mt-5 block space-y-1.5 text-sm">
                  <span className="font-bold text-[var(--fs-ink)]">Your name</span>
                  <input
                    className={inputClass}
                    type="text"
                    name="name"
                    autoComplete="name"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </label>
              )}

              {channel === "phone" ? (
                <label className={`block space-y-1.5 text-sm ${isSignup ? "mt-4" : "mt-5"}`}>
                  <span className="font-bold text-[var(--fs-ink)]">Phone number</span>
                  <input
                    className={inputClass}
                    type="tel"
                    name="phone"
                    autoComplete="tel"
                    placeholder="+91 98XXXXXXXX"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setFieldError("");
                    }}
                    required
                  />
                  {fieldError ? (
                    <span className="block text-xs font-semibold text-rose-600">{fieldError}</span>
                  ) : (
                    <span className="block text-xs font-medium text-[var(--fs-muted)]">
                      We’ll send a 6-digit OTP by SMS
                    </span>
                  )}
                </label>
              ) : (
                <label className={`block space-y-1.5 text-sm ${isSignup ? "mt-4" : "mt-5"}`}>
                  <span className="font-bold text-[var(--fs-ink)]">Email address</span>
                  <input
                    className={inputClass}
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setFieldError("");
                    }}
                    required
                  />
                  {fieldError ? (
                    <span className="block text-xs font-semibold text-rose-600">{fieldError}</span>
                  ) : (
                    <span className="block text-xs font-medium text-[var(--fs-muted)]">
                      We’ll email a 6-digit verification code
                    </span>
                  )}
                </label>
              )}

              <button type="submit" disabled={sending} className="fs-btn-primary mt-6 w-full !py-3.5">
                {sending ? "Sending…" : channel === "phone" ? "Continue with OTP" : "Send email code"}
              </button>

              <p className="mt-6 text-center text-sm font-medium text-[var(--fs-muted)]">
                {isSignup ? (
                  <>
                    Already have an account?{" "}
                    <Link href={`/login${qs}`} className="font-extrabold text-[var(--fs-accent)] hover:underline">
                      Sign in
                    </Link>
                  </>
                ) : (
                  <>
                    New to Fruit Shop?{" "}
                    <Link href={`/signup${qs}`} className="font-extrabold text-[var(--fs-accent)] hover:underline">
                      Create account
                    </Link>
                  </>
                )}
              </p>
            </form>
          ) : (
            <form onSubmit={onVerify}>
              <button
                type="button"
                className="mb-4 text-sm font-bold text-[var(--fs-muted)] hover:text-[var(--fs-accent)]"
                onClick={() => {
                  setStep("identifier");
                  setCode("");
                }}
              >
                ← Back
              </button>

              <h1 className="text-2xl font-extrabold tracking-tight text-[var(--fs-ink)]">
                Enter verification code
              </h1>
              <p className="mt-1.5 text-sm font-medium text-[var(--fs-muted)]">
                Code sent to{" "}
                <span className="font-bold text-[var(--fs-ink)]">{destinationLabel}</span>
              </p>

              <label className="mt-6 block space-y-1.5 text-sm">
                <span className="font-bold text-[var(--fs-ink)]">6-digit code</span>
                <input
                  className={`${inputClass} text-center text-lg font-extrabold tracking-[0.4em]`}
                  type="text"
                  name="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  minLength={4}
                  autoFocus
                />
              </label>

              <button
                type="submit"
                disabled={verifying || code.length < 4}
                className="fs-btn-primary mt-6 w-full !py-3.5"
              >
                {verifying ? "Verifying…" : "Verify & continue"}
              </button>

              <button
                type="button"
                disabled={resendIn > 0 || sending}
                className="mt-4 w-full text-center text-sm font-bold text-[var(--fs-accent)] hover:underline disabled:cursor-not-allowed disabled:text-[var(--fs-muted)] disabled:no-underline"
                onClick={() => void onResend()}
              >
                {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-8 text-center text-sm font-semibold text-[var(--fs-muted)]">
          <Link href="/" className="hover:text-[var(--fs-accent)]">
            ← Back to shop
          </Link>
        </p>
      </div>
    </div>
  );
}
