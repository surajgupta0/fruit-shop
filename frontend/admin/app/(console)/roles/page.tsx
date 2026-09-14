"use client";

import { useQuery } from "@fruitshop/web-core";

import { RequirePermission } from "@/src/components/RequirePermission";
import { P } from "@/src/console/permissions";
import {
  EmptyState,
  ErrorLine,
  LoadingLine,
  PageHeader,
  SectionLabel,
  Surface,
} from "@/src/console/ui";
import { usersApi } from "@/src/modules/users/api";

function RolesPanel() {
  const roles = useQuery(() => usersApi.listRoles(), []);
  const permissions = useQuery(() => usersApi.listPermissions(), []);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        title="Roles"
        description="See which permissions each role grants."
      />

      <section>
        <SectionLabel>Roles</SectionLabel>
        {roles.isLoading && <LoadingLine label="Loading roles…" />}
        {roles.error && <ErrorLine message={roles.error.message} />}
        <div className="grid gap-3 lg:grid-cols-3">
          {(roles.data ?? []).map((role) => (
            <Surface key={role.id} padded>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-extrabold capitalize text-[var(--fs-ink)]">
                  {role.name}
                </h3>
                <span className="rounded-md bg-[var(--fs-mist)] px-2 py-0.5 text-[11px] font-medium text-[var(--fs-accent-deep)]">
                  {role.permissions.length}
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--fs-muted)]">
                {role.description || "No description"}
              </p>
              <ul className="mt-4 max-h-52 space-y-1 overflow-y-auto border-t border-[var(--fs-line)] pt-3">
                {role.permissions.map((code) => (
                  <li key={code} className="font-mono text-[11px] text-stone-600">
                    {code}
                  </li>
                ))}
              </ul>
            </Surface>
          ))}
        </div>
      </section>

      <section>
        <SectionLabel>Permission catalog</SectionLabel>
        <Surface>
          {permissions.isLoading && <LoadingLine />}
          {permissions.error && <ErrorLine message={permissions.error.message} />}
          {permissions.data && permissions.data.length === 0 && (
            <EmptyState title="No permissions seeded" />
          )}
          {permissions.data && permissions.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--fs-line)] bg-[var(--fs-mist)]/60 text-[11px] uppercase tracking-[0.1em] text-[var(--fs-muted)]">
                    <th className="px-4 py-3 font-semibold">Code</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--fs-line)]">
                  {permissions.data.map((p) => (
                    <tr key={p.id} className="hover:bg-[var(--fs-mist)]/30">
                      <td className="px-4 py-2.5 font-mono text-xs text-[var(--fs-accent-deep)]">
                        {p.code}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--fs-muted)]">
                        {p.description || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Surface>
      </section>
    </div>
  );
}

export default function RolesPage() {
  return (
    <RequirePermission permission={P.ROLES_LIST}>
      <RolesPanel />
    </RequirePermission>
  );
}
