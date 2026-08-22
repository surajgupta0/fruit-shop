"use client";

import { Suspense } from "react";

import LoginPage from "./LoginForm";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-stone-500">Loading…</div>}>
      <LoginPage />
    </Suspense>
  );
}
