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
  const headline = isSignup ? "Join Fruit Shop" : "Welcome back";
  const sub = isSignup
    ? "Sign up with your mobile or email — we’ll send a one-time code."
    : "Sign in with mobile OTP or email code — no password needed.";

  const destinationLabel =
    channel === "phone" ? formatPhoneDisplay(phone) : normalizeEmail(email);

  if (bootstrapping) {
    return (
      <div className="grid min-h-dvh place-items-center text-sm text-[var(--fs-muted)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(1100px_560px_at_0%_0%,rgba(47,143,78,0.45),transparent),radial-gradient(800px_480px_at_100%_15%,rgba(244,162,97,0.35),transparent),linear-gradient(155deg,#0c2e1c_0%,#14532d_48%,#0f3d24_100%)]"
      />
      <div
        aria-hidden
        className="fs-drift pointer-events-none absolute bottom-8 left-[20%] h-64 w-64 rounded-full bg-white/10 blur-3xl"
      />

      <main className="relative z-10 mx-auto grid min-h-dvh max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
        <section className="fs-rise text-white">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-white/90 transition hover:text-white"
          >
            <span className="fs-brand-mark grid size-10 place-items-center rounded-xl">
              <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
                <path
                  d="M12 3c.4 1.6 1.4 2.6 3 3-1.2.2-2.2.8-2.8 1.8C11.4 6.8 10.2 5.6 8.5 5c1.5-.2 2.8-1 3.5-2z"
                  opacity=".9"
                />
                <ellipse cx="12" cy="14.5" rx="6.5" ry="7" />
              </svg>
            </span>
            <span className="font-[family-name:var(--font-fraunces)] text-2xl tracking-tight">
              Fruit Shop
            </span>
          </Link>
          <h1 className="mt-8 max-w-md font-[family-name:var(--font-fraunces)] text-3xl leading-snug sm:text-4xl">
            {headline}
          </h1>
          <p className="mt-4 max-w-md text-sm text-white/70 sm:text-base">{sub}</p>
          <ul className="mt-8 space-y-2 text-sm text-white/55">
            <li>Mobile OTP or email verification code</li>
            <li>Same account whether you use phone or email</li>
            <li>Your orders stay linked to your profile</li>
          </ul>
        </section>

        <section className="fs-rise-delay mx-auto w-full max-w-md">
          {step === "identifier" ? (
            <form
              onSubmit={onSendOtp}
              className="rounded-3xl border border-white/20 bg-white/95 p-7 shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur"
              noValidate
            >
              <h2 className="font-[family-name:var(--font-fraunces)] text-2xl text-[var(--fs-ink)]">
                {isSignup ? "Sign up" : "Sign in"}
              </h2>
              <p className="mt-1 text-sm text-[var(--fs-muted)]">Choose how you want to verify</p>

              <div
                className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-[var(--fs-mist)] p-1"
                role="tablist"
                aria-label="Sign-in method"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={channel === "phone"}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
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
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
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
                <label className="mt-6 block space-y-1.5 text-sm">
                  <span className="font-medium text-stone-700">Your name</span>
                  <input
                    className="w-full rounded-xl border border-[var(--fs-line)] bg-[var(--fs-mist)]/50 px-3.5 py-2.5 outline-none transition focus:border-[var(--fs-leaf)] focus:bg-white focus:ring-2 focus:ring-[var(--fs-leaf)]/20"
                    type="text"
                    name="name"
                    autoComplete="name"
                    placeholder="How should we greet you?"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </label>
              )}

              {channel === "phone" ? (
                <label className={`block space-y-1.5 text-sm ${isSignup ? "mt-4" : "mt-6"}`}>
                  <span className="font-medium text-stone-700">Phone number</span>
                  <input
                    className="w-full rounded-xl border border-[var(--fs-line)] bg-[var(--fs-mist)]/50 px-3.5 py-2.5 outline-none transition focus:border-[var(--fs-leaf)] focus:bg-white focus:ring-2 focus:ring-[var(--fs-leaf)]/20"
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
                    <span className="block text-xs text-rose-600">{fieldError}</span>
                  ) : (
                    <span className="block text-xs text-[var(--fs-muted)]">
                      We’ll send a 6-digit code by SMS
                    </span>
                  )}
                </label>
              ) : (
                <label className={`block space-y-1.5 text-sm ${isSignup ? "mt-4" : "mt-6"}`}>
                  <span className="font-medium text-stone-700">Email address</span>
                  <input
                    className="w-full rounded-xl border border-[var(--fs-line)] bg-[var(--fs-mist)]/50 px-3.5 py-2.5 outline-none transition focus:border-[var(--fs-leaf)] focus:bg-white focus:ring-2 focus:ring-[var(--fs-leaf)]/20"
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
                    <span className="block text-xs text-rose-600">{fieldError}</span>
                  ) : (
                    <span className="block text-xs text-[var(--fs-muted)]">
                      We’ll email a 6-digit verification code
                    </span>
                  )}
                </label>
              )}

              <button
                type="submit"
                disabled={sending}
                className="mt-6 w-full rounded-xl bg-[var(--fs-leaf-deep)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--fs-leaf)] disabled:opacity-60"
              >
                {sending ? "Sending…" : channel === "phone" ? "Send OTP" : "Send email code"}
              </button>

              <p className="mt-5 text-center text-sm text-[var(--fs-muted)]">
                {isSignup ? (
                  <>
                    Already shopping with us?{" "}
                    <Link
                      href={`/login${search.toString() ? `?${search.toString()}` : ""}`}
                      className="font-medium text-[var(--fs-leaf)] hover:underline"
                    >
                      Sign in
                    </Link>
                  </>
                ) : (
                  <>
                    New here?{" "}
                    <Link
                      href={`/signup${search.toString() ? `?${search.toString()}` : ""}`}
                      className="font-medium text-[var(--fs-leaf)] hover:underline"
                    >
                      Create an account
                    </Link>
                  </>
                )}
              </p>
              <p className="mt-3 text-center text-xs text-[var(--fs-muted)]">
                <Link href="/" className="hover:text-[var(--fs-leaf)]">
                  ← Back to shop
                </Link>
              </p>
            </form>
          ) : (
            <form
              onSubmit={onVerify}
              className="rounded-3xl border border-white/20 bg-white/95 p-7 shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur"
            >
              <h2 className="font-[family-name:var(--font-fraunces)] text-2xl text-[var(--fs-ink)]">
                Enter code
              </h2>
              <p className="mt-1 text-sm text-[var(--fs-muted)]">
                Sent to{" "}
                <span className="font-medium text-stone-700">{destinationLabel}</span>
              </p>

              <label className="mt-6 block space-y-1.5 text-sm">
                <span className="font-medium text-stone-700">6-digit code</span>
                <input
                  className="w-full rounded-xl border border-[var(--fs-line)] bg-[var(--fs-mist)]/50 px-3.5 py-2.5 tracking-[0.35em] outline-none transition focus:border-[var(--fs-leaf)] focus:bg-white focus:ring-2 focus:ring-[var(--fs-leaf)]/20"
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
                />
              </label>

              <button
                type="submit"
                disabled={verifying || code.length < 4}
                className="mt-6 w-full rounded-xl bg-[var(--fs-leaf-deep)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--fs-leaf)] disabled:opacity-60"
              >
                {verifying ? "Verifying…" : "Verify & continue"}
              </button>

              <div className="mt-4 flex flex-col gap-2 text-center text-sm">
                <button
                  type="button"
                  disabled={resendIn > 0 || sending}
                  className="text-[var(--fs-leaf)] hover:underline disabled:cursor-not-allowed disabled:text-[var(--fs-muted)] disabled:no-underline"
                  onClick={() => void onResend()}
                >
                  {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
                </button>
                <button
                  type="button"
                  className="text-[var(--fs-muted)] hover:text-[var(--fs-leaf)]"
                  onClick={() => {
                    setStep("identifier");
                    setCode("");
                  }}
                >
                  {channel === "phone" ? "Change phone number" : "Change email address"}
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
