"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useMutation } from "@fruitshop/web-core";

type Mode = "login" | "signup";

type Props = {
  mode: Mode;
};

export function CustomerAuthForm({ mode }: Props) {
  const { requestOtp, verifyOtp, isAuthenticated, bootstrapping } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/";

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("+91");
  const [code, setCode] = useState("");

  const sendMutation = useMutation(async (p: string) => requestOtp(p));
  const verifyMutation = useMutation(async (p: string, c: string) => verifyOtp(p, c));

  useEffect(() => {
    if (!bootstrapping && isAuthenticated) router.replace(next);
  }, [bootstrapping, isAuthenticated, next, router]);

  async function onSendOtp(event: FormEvent) {
    event.preventDefault();
    try {
      await sendMutation.mutate(phone.trim());
      setStep("otp");
    } catch {
      /* toast */
    }
  }

  async function onVerify(event: FormEvent) {
    event.preventDefault();
    try {
      await verifyMutation.mutate(phone.trim(), code.trim());
      router.replace(next);
    } catch {
      /* toast */
    }
  }

  const headline =
    mode === "signup" ? "Create your Fruit Shop account" : "Welcome back";
  const sub =
    mode === "signup"
      ? "Enter your mobile number — we’ll text a one-time code. New numbers are registered automatically."
      : "Sign in with your phone. We’ll send a one-time code — no password needed.";

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(1100px_560px_at_0%_0%,#2f8f5b66,transparent),radial-gradient(800px_480px_at_100%_20%,#e8a31740,transparent),linear-gradient(155deg,#0f3d28_0%,#1a5638_50%,#0d2e1d_100%)]"
      />
      <div
        aria-hidden
        className="fs-drift pointer-events-none absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-[#ffffff14] blur-3xl"
      />

      <main className="relative z-10 mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-6 py-12 lg:grid-cols-2">
        <section className="fs-rise text-white">
          <p className="font-[family-name:var(--font-fraunces)] text-4xl leading-none tracking-tight sm:text-5xl lg:text-6xl">
            Fruit Shop
          </p>
          <h1 className="mt-5 max-w-md font-[family-name:var(--font-fraunces)] text-2xl leading-snug text-white sm:text-3xl">
            {headline}
          </h1>
          <p className="mt-4 max-w-md text-sm text-white/70 sm:text-base">{sub}</p>
        </section>

        <section className="fs-rise-delay mx-auto w-full max-w-md">
          {step === "phone" ? (
            <form
              onSubmit={onSendOtp}
              className="rounded-3xl bg-white/95 p-7 shadow-[0_24px_60px_rgba(0,0,0,0.25)]"
            >
              <h2 className="font-[family-name:var(--font-fraunces)] text-2xl text-[var(--fs-ink)]">
                {mode === "signup" ? "Sign up" : "Sign in"}
              </h2>
              <p className="mt-1 text-sm text-stone-500">Mobile OTP verification</p>

              <label className="mt-6 block space-y-1.5 text-sm">
                <span className="font-medium text-stone-700">Phone number</span>
                <input
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 outline-none transition focus:border-[var(--fs-leaf)] focus:bg-white focus:ring-2 focus:ring-[var(--fs-leaf)]/20"
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  placeholder="+9198XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  minLength={8}
                />
              </label>

              <button
                type="submit"
                disabled={sendMutation.isLoading}
                className="mt-6 w-full rounded-xl bg-[var(--fs-leaf-deep)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--fs-leaf)] disabled:opacity-60"
              >
                {sendMutation.isLoading ? "Sending…" : "Send OTP"}
              </button>

              <p className="mt-5 text-center text-sm text-stone-500">
                {mode === "signup" ? (
                  <>
                    Already shopping with us?{" "}
                    <Link href="/login" className="font-medium text-[var(--fs-leaf)] hover:underline">
                      Sign in
                    </Link>
                  </>
                ) : (
                  <>
                    New here?{" "}
                    <Link
                      href="/signup"
                      className="font-medium text-[var(--fs-leaf)] hover:underline"
                    >
                      Create an account
                    </Link>
                  </>
                )}
              </p>
            </form>
          ) : (
            <form
              onSubmit={onVerify}
              className="rounded-3xl bg-white/95 p-7 shadow-[0_24px_60px_rgba(0,0,0,0.25)]"
            >
              <h2 className="font-[family-name:var(--font-fraunces)] text-2xl text-[var(--fs-ink)]">
                Enter OTP
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Sent to <span className="font-medium text-stone-700">{phone}</span>
              </p>

              <label className="mt-6 block space-y-1.5 text-sm">
                <span className="font-medium text-stone-700">6-digit code</span>
                <input
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 tracking-[0.35em] outline-none transition focus:border-[var(--fs-leaf)] focus:bg-white focus:ring-2 focus:ring-[var(--fs-leaf)]/20"
                  type="text"
                  name="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={8}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  required
                  minLength={4}
                />
              </label>

              <button
                type="submit"
                disabled={verifyMutation.isLoading}
                className="mt-6 w-full rounded-xl bg-[var(--fs-leaf-deep)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--fs-leaf)] disabled:opacity-60"
              >
                {verifyMutation.isLoading ? "Verifying…" : "Verify & continue"}
              </button>

              <button
                type="button"
                className="mt-4 w-full text-sm text-[var(--fs-leaf)] hover:underline"
                onClick={() => {
                  setStep("phone");
                  setCode("");
                }}
              >
                Change phone number
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
