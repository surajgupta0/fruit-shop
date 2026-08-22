"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth, useMutation, useQuery } from "@fruitshop/web-core";

import { RequirePermission } from "@/src/components/RequirePermission";
import { usersApi, type UserRole } from "@/src/modules/users/api";

function UserDetailPanel({ userId }: { userId: string }) {
  const { hasPermission, user: me } = useAuth();
  const detail = useQuery(() => usersApi.get(userId), [userId]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("staff");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!detail.data) return;
    setName(detail.data.name);
    setEmail(detail.data.email ?? "");
    setPhone(detail.data.phone);
    setRole(detail.data.role as UserRole);
  }, [detail.data]);

  const saveProfile = useMutation(() =>
    usersApi.update(userId, {
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim(),
    }),
  );
  const saveRole = useMutation(() => usersApi.setRole(userId, role));
  const saveStatus = useMutation((is_active: boolean) => usersApi.setStatus(userId, is_active));
  const savePassword = useMutation(() => usersApi.setPassword(userId, password));

  if (detail.isLoading) {
    return <p className="text-sm text-stone-500">Loading user…</p>;
  }
  if (detail.error || !detail.data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-rose-600">{detail.error?.message ?? "User not found"}</p>
        <Link href="/users" className="text-sm text-[var(--fs-leaf)] hover:underline">
          Back to users
        </Link>
      </div>
    );
  }

  const u = detail.data;
  const isSelf = me?.id === u.id;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/users" className="text-sm text-stone-500 hover:text-[var(--fs-leaf)]">
          ← Users
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-[family-name:var(--font-fraunces)] text-3xl tracking-tight">
              {u.name}
            </h1>
            <p className="mt-1 text-sm text-stone-500 capitalize">
              {u.role} · {u.is_active ? "Active" : "Inactive"}
              {isSelf ? " · you" : ""}
            </p>
          </div>
          {hasPermission("users:deactivate") && !isSelf && (
            <button
              type="button"
              disabled={saveStatus.isLoading}
              onClick={async () => {
                try {
                  await saveStatus.mutate(!u.is_active);
                  await detail.refetch();
                } catch {
                  /* toast */
                }
              }}
              className="rounded-lg border border-stone-200 px-3 py-2 text-sm hover:bg-stone-50"
            >
              {u.is_active ? "Deactivate" : "Activate"}
            </button>
          )}
        </div>
      </div>

      {hasPermission("users:update") && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="font-medium">Profile</h2>
          <form
            className="mt-4 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await saveProfile.mutate();
                await detail.refetch();
              } catch {
                /* toast */
              }
            }}
          >
            <label className="block text-sm">
              <span className="text-stone-600">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 outline-none focus:border-[var(--fs-leaf)]"
              />
            </label>
            <label className="block text-sm">
              <span className="text-stone-600">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 outline-none focus:border-[var(--fs-leaf)]"
              />
            </label>
            <label className="block text-sm">
              <span className="text-stone-600">Phone</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 outline-none focus:border-[var(--fs-leaf)]"
              />
            </label>
            <button
              type="submit"
              disabled={saveProfile.isLoading}
              className="rounded-lg bg-[var(--fs-leaf)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--fs-leaf-deep)] disabled:opacity-60"
            >
              {saveProfile.isLoading ? "Saving…" : "Save profile"}
            </button>
          </form>
        </section>
      )}

      {hasPermission("users:change_role") && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="font-medium">Role</h2>
          <form
            className="mt-4 flex flex-wrap items-end gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await saveRole.mutate();
                await detail.refetch();
              } catch {
                /* toast */
              }
            }}
          >
            <label className="block flex-1 text-sm">
              <span className="text-stone-600">Assigned role</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"
              >
                <option value="customer">Customer</option>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <button
              type="submit"
              disabled={saveRole.isLoading}
              className="rounded-lg border border-stone-200 px-4 py-2 text-sm hover:bg-stone-50 disabled:opacity-60"
            >
              {saveRole.isLoading ? "Updating…" : "Update role"}
            </button>
          </form>
        </section>
      )}

      {hasPermission("users:update") && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="font-medium">Reset password</h2>
          <p className="mt-1 text-sm text-stone-500">Minimum 8 characters. For staff/admin login.</p>
          <form
            className="mt-4 flex flex-wrap items-end gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await savePassword.mutate();
                setPassword("");
              } catch {
                /* toast */
              }
            }}
          >
            <label className="block flex-1 text-sm">
              <span className="text-stone-600">New password</span>
              <input
                type="password"
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 outline-none focus:border-[var(--fs-leaf)]"
              />
            </label>
            <button
              type="submit"
              disabled={savePassword.isLoading}
              className="rounded-lg border border-stone-200 px-4 py-2 text-sm hover:bg-stone-50 disabled:opacity-60"
            >
              {savePassword.isLoading ? "Saving…" : "Set password"}
            </button>
          </form>
        </section>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="font-medium">Permissions</h2>
        <p className="mt-3 text-xs leading-relaxed text-stone-500">
          {u.permissions.length ? u.permissions.join(" · ") : "None"}
        </p>
      </section>
    </div>
  );
}

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = params.id;

  return (
    <RequirePermission permission="users:list">
      <UserDetailPanel userId={userId} />
    </RequirePermission>
  );
}
