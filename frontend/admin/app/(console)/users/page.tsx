"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth, useMutation, useQuery } from "@fruitshop/web-core";

import { RequirePermission } from "@/src/components/RequirePermission";
import { usersApi, type CreateUserInput } from "@/src/modules/users/api";

function statusBadge(active: boolean) {
  return active
    ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
    : "bg-stone-100 text-stone-600 ring-stone-200";
}

function CreateUserForm({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<CreateUserInput>({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "staff",
  });

  const create = useMutation((body: CreateUserInput) => usersApi.create(body));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-labelledby="create-user-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 id="create-user-title" className="font-[family-name:var(--font-fraunces)] text-xl">
          Create staff user
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Staff and admins sign in with email and password.
        </p>

        <form
          className="mt-5 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await create.mutate(form);
              onCreated();
              onClose();
              setForm({ name: "", email: "", phone: "", password: "", role: "staff" });
            } catch {
              /* toast from api */
            }
          }}
        >
          {(
            [
              ["name", "Name", "text"],
              ["email", "Email", "email"],
              ["phone", "Phone", "tel"],
              ["password", "Password", "password"],
            ] as const
          ).map(([key, label, type]) => (
            <label key={key} className="block text-sm">
              <span className="text-stone-600">{label}</span>
              <input
                required
                type={type}
                minLength={key === "password" ? 8 : undefined}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 outline-none focus:border-[var(--fs-leaf)]"
              />
            </label>
          ))}

          <label className="block text-sm">
            <span className="text-stone-600">Role</span>
            <select
              value={form.role}
              onChange={(e) =>
                setForm((f) => ({ ...f, role: e.target.value as "staff" | "admin" }))
              }
              className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 outline-none focus:border-[var(--fs-leaf)]"
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isLoading}
              className="rounded-lg bg-[var(--fs-leaf)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--fs-leaf-deep)] disabled:opacity-60"
            >
              {create.isLoading ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UsersPanel() {
  const { hasPermission } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);

  const params = useMemo(
    () => ({
      page,
      page_size: 20,
      search: search.trim() || undefined,
      role: role || undefined,
      is_active:
        activeFilter === "true" ? true : activeFilter === "false" ? false : undefined,
    }),
    [page, search, role, activeFilter],
  );

  const list = useQuery(() => usersApi.list(params), [params]);

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.page_size)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl tracking-tight">
            Users
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Manage accounts, roles, and active status.
          </p>
        </div>
        {hasPermission("users:create") && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-lg bg-[var(--fs-leaf)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--fs-leaf-deep)]"
          >
            Create user
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Search name, email, phone…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="min-w-[200px] flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--fs-leaf)]"
        />
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">All roles</option>
          <option value="customer">Customer</option>
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={activeFilter}
          onChange={(e) => {
            setActiveFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">Any status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        {list.isLoading && <p className="p-6 text-sm text-stone-500">Loading users…</p>}
        {list.error && (
          <p className="p-6 text-sm text-rose-600">{list.error.message}</p>
        )}
        {list.data && (
          <>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-100 bg-stone-50/80 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Contact</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {list.data.items.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50/60">
                    <td className="px-4 py-3">
                      <Link
                        href={`/users/${u.id}`}
                        className="font-medium text-[var(--fs-ink)] hover:text-[var(--fs-leaf)]"
                      >
                        {u.name}
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 text-stone-500 sm:table-cell">
                      <div>{u.email || "—"}</div>
                      <div className="text-xs">{u.phone}</div>
                    </td>
                    <td className="px-4 py-3 capitalize text-stone-700">{u.role}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs ring-1 ring-inset ${statusBadge(u.is_active)}`}
                      >
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
                {list.data.items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-stone-500">
                      No users match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-stone-100 px-4 py-3 text-sm text-stone-500">
              <span>
                {list.data.total} total · page {list.data.page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-stone-200 px-3 py-1 disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-stone-200 px-3 py-1 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <CreateUserForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => void list.refetch()}
      />
    </div>
  );
}

export default function UsersPage() {
  return (
    <RequirePermission permission="users:list">
      <UsersPanel />
    </RequirePermission>
  );
}