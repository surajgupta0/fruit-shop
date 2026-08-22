"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useMutation } from "@fruitshop/web-core";

export default function LoginForm() {
  const { login, isAuthenticated, bootstrapping } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("admin@fruitshop.example");
  const [password, setPassword] = useState("Admin@12345");

  const mutation = useMutation(async (e: string, p: string) => login(e, p));

  if (!bootstrapping && isAuthenticated) {
    router.replace(search.get("next") || "/");
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await mutation.mutate(email, password);
      router.replace(search.get("next") || "/");
    } catch {
      // error toast from api client
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Fruit Shop Admin</h1>
          <p className="mt-1 text-sm text-stone-500">Sign in with staff credentials</p>
        </div>

        <label className="block space-y-1 text-sm">
          <span className="text-stone-600">Email</span>
          <input
            className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-stone-500"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="text-stone-600">Password</span>
          <input
            className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-stone-500"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>

        <button
          type="submit"
          disabled={mutation.isLoading}
          className="w-full rounded-lg bg-stone-900 px-3 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {mutation.isLoading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
