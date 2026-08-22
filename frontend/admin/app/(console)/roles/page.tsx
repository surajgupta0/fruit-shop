"use client";

import { useQuery } from "@fruitshop/web-core";

import { RequirePermission } from "@/src/components/RequirePermission";
import { usersApi } from "@/src/modules/users/api";

function RolesPanel() {
  const roles = useQuery(() => usersApi.listRoles(), []);
  const permissions = useQuery(() => usersApi.listPermissions(), []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-fraunces)] text-3xl tracking-tight">
          Roles & access
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Roles are seeded by the API. Permission assignment is read-only here for now.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500">Roles</h2>
        {roles.isLoading && <p className="text-sm text-stone-500">Loading roles…</p>}
        {roles.error && <p className="text-sm text-rose-600">{roles.error.message}</p>}
        <div className="grid gap-4 lg:grid-cols-3">
          {(roles.data ?? []).map((role) => (
            <article
              key={role.id}
              className="rounded-2xl border border-stone-200 bg-white p-5"
            >
              <h3 className="font-medium capitalize text-[var(--fs-ink)]">{role.name}</h3>
              <p className="mt-1 text-sm text-stone-500">
                {role.description || "No description"}
              </p>
              <p className="mt-3 text-xs text-stone-400">
                {role.permissions.length} permissions
              </p>
              <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-xs text-stone-600">
                {role.permissions.map((code) => (
                  <li key={code} className="font-mono">
                    {code}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500">
          All permissions
        </h2>
        {permissions.isLoading && <p className="text-sm text-stone-500">Loading…</p>}
        {permissions.error && (
          <p className="text-sm text-rose-600">{permissions.error.message}</p>
        )}
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-100 bg-stone-50/80 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {(permissions.data ?? []).map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2.5 font-mono text-xs text-stone-800">{p.code}</td>
                  <td className="px-4 py-2.5 text-stone-600">{p.description || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function RolesPage() {
  return (
    <RequirePermission permission="roles:list">
      <RolesPanel />
    </RequirePermission>
  );
}
