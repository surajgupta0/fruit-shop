"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth, useMutation, useQuery } from "@fruitshop/web-core";

import { Can, RequirePermission } from "@/src/components/RequirePermission";
import { P } from "@/src/console/permissions";
import {
  Btn,
  EmptyState,
  ErrorLine,
  Field,
  Input,
  LoadingLine,
  PageHeader,
  Select,
  StatusPill,
  Surface,
} from "@/src/console/ui";
import { usersApi, type CreateUserInput } from "@/src/modules/users/api";

function CreateUserForm({
  open,
  onClose,
  onCreated,
  canCreateAdmin,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  canCreateAdmin: boolean;
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

  const roleValue = form.role === "admin" && !canCreateAdmin ? "staff" : form.role;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--fs-accent-deep)]/40 p-4 backdrop-blur-[2px] sm:items-center">
      <div
        role="dialog"
        aria-labelledby="create-user-title"
        className="w-full max-w-md rounded-2xl border border-[var(--fs-line)] bg-white p-6 shadow-2xl"
      >
        <h2
          id="create-user-title"
          className="text-xl font-extrabold text-[var(--fs-ink)]"
        >
          Create staff user
        </h2>
        <p className="mt-1 text-sm text-[var(--fs-muted)]">
          Staff and admins sign in with email and password.
        </p>

        <form
          className="mt-5 space-y-3.5"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await create.mutate({ ...form, role: roleValue });
              onCreated();
              onClose();
              setForm({ name: "", email: "", phone: "", password: "", role: "staff" });
            } catch {
              /* toast */
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
            <Field key={key} label={label}>
              <Input
                required
                type={type}
                minLength={key === "password" ? 8 : undefined}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </Field>
          ))}

          <Field label="Role">
            <Select
              value={roleValue}
              onChange={(e) =>
                setForm((f) => ({ ...f, role: e.target.value as "staff" | "admin" }))
              }
            >
              <option value="staff">Staff</option>
              {canCreateAdmin ? <option value="admin">Admin</option> : null}
            </Select>
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Btn type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Btn>
            <Btn type="submit" disabled={create.isLoading}>
              {create.isLoading ? "Creating…" : "Create user"}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}

function UsersPanel() {
  const { hasPermission, hasRole } = useAuth();
  const canRead = hasPermission(P.USERS_READ);
  const canCreate = hasPermission(P.USERS_CREATE);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
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
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Users"
        description="Create desk logins, change roles, and activate or pause accounts."
        actions={
          <Can permission={P.USERS_CREATE}>
            <Btn onClick={() => setCreateOpen(true)}>Create user</Btn>
          </Can>
        }
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <Input
          type="search"
          placeholder="Search name, email, phone…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All roles</option>
          <option value="customer">Customer</option>
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </Select>
        <Select
          value={activeFilter}
          onChange={(e) => {
            setActiveFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Any status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>
      </div>

      <Surface>
        {list.isLoading && <LoadingLine label="Loading users…" />}
        {list.error && <ErrorLine message={list.error.message} />}
        {list.data && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--fs-line)] bg-[var(--fs-mist)]/60 text-[11px] uppercase tracking-[0.1em] text-[var(--fs-muted)]">
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Contact</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--fs-line)]">
                  {list.data.items.map((u) => (
                    <tr key={u.id} className="transition hover:bg-[var(--fs-mist)]/40">
                      <td className="px-4 py-3.5">
                        {canRead ? (
                          <Link
                            href={`/users/${u.id}`}
                            className="font-medium text-[var(--fs-ink)] hover:text-[var(--fs-accent)]"
                          >
                            {u.name}
                          </Link>
                        ) : (
                          <span className="font-medium text-[var(--fs-ink)]">{u.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-[var(--fs-muted)]">
                        <div className="truncate">{u.email || "—"}</div>
                        <div className="text-xs">{u.phone}</div>
                      </td>
                      <td className="px-4 py-3.5 capitalize text-stone-700">{u.role}</td>
                      <td className="px-4 py-3.5">
                        <StatusPill tone={u.is_active ? "ok" : "neutral"}>
                          {u.is_active ? "Active" : "Inactive"}
                        </StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {list.data.items.length === 0 && (
              <EmptyState
                title="No users match"
                body="Try clearing filters or creating a staff user."
              />
            )}
            <div className="flex items-center justify-between border-t border-[var(--fs-line)] px-4 py-3 text-sm text-[var(--fs-muted)]">
              <span>
                {list.data.total} total · page {list.data.page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Btn
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="!py-1.5"
                >
                  Prev
                </Btn>
                <Btn
                  variant="secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="!py-1.5"
                >
                  Next
                </Btn>
              </div>
            </div>
          </>
        )}
      </Surface>

      <Can permission={P.USERS_CREATE}>
        <CreateUserForm
          open={createOpen && canCreate}
          onClose={() => setCreateOpen(false)}
          onCreated={() => void list.refetch()}
          canCreateAdmin={hasRole("admin")}
        />
      </Can>
    </div>
  );
}

export default function UsersPage() {
  return (
    <RequirePermission permission={P.USERS_LIST}>
      <UsersPanel />
    </RequirePermission>
  );
}
