"use client";

import { useQuery } from "@fruitshop/web-core";

import { RequirePermission } from "@/src/components/RequirePermission";
import { P } from "@/src/console/permissions";
import {
  ConsolePage,
  EmptyState,
  ErrorLine,
  PageHeader,
  Panel,
  SectionLabel,
  Surface,
  TableHead,
  TableSkeleton,
} from "@/src/console/ui";
import { usersApi } from "@/src/modules/users/api";

function RolesPanel() {
  const roles = useQuery(() => usersApi.listRoles(), []);
  const permissions = useQuery(() => usersApi.listPermissions(), []);

  return (
    <ConsolePage>
      <PageHeader
        eyebrow="Team"
        title="Roles"
        description="See which permissions each role grants — assigned when you create or edit users."
      />

      <section>
        <SectionLabel>Roles</SectionLabel>
        {roles.isLoading && (
          <div className="grid gap-3 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Surface key={i} padded>
                <div className="fs-skeleton h-6 w-24" />
                <div className="fs-skeleton mt-3 h-4 w-full" />
                <div className="fs-skeleton mt-2 h-4 w-3/4" />
                <div className="mt-4 space-y-2 border-t border-[var(--fs-line)] pt-3">
                  <div className="fs-skeleton h-8 w-full !rounded-lg" />
                  <div className="fs-skeleton h-8 w-full !rounded-lg" />
                  <div className="fs-skeleton h-8 w-5/6 !rounded-lg" />
                </div>
              </Surface>
            ))}
          </div>
        )}
        {roles.error && <ErrorLine message={roles.error.message} />}
        {roles.data && roles.data.length === 0 && (
          <EmptyState title="No roles" body="Roles are seeded with the API." />
        )}
        {roles.data && roles.data.length > 0 && (
          <div className="grid gap-3 lg:grid-cols-3">
            {roles.data.map((role) => (
              <Panel
                key={role.id}
                title={role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                description={role.description || "No description"}
                action={
                  <span className="rounded-lg bg-[var(--fs-mist)] px-2.5 py-1 text-[11px] font-extrabold tabular-nums text-[var(--fs-accent-deep)]">
                    {role.permissions.length}
                  </span>
                }
                padded
              >
                <ul className="max-h-56 space-y-1.5 overflow-y-auto">
                  {role.permissions.length === 0 && (
                    <li className="text-sm font-medium text-[var(--fs-muted)]">No permissions</li>
                  )}
                  {role.permissions.map((code) => (
                    <li
                      key={code}
                      className="rounded-lg bg-[var(--fs-canvas)] px-2.5 py-1.5 font-mono text-[11px] font-semibold text-[var(--fs-ink)]"
                    >
                      {code}
                    </li>
                  ))}
                </ul>
              </Panel>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionLabel>Permission catalog</SectionLabel>
        <Surface>
          {permissions.isLoading && <TableSkeleton rows={8} />}
          {permissions.error && <ErrorLine message={permissions.error.message} />}
          {permissions.data && permissions.data.length === 0 && (
            <EmptyState title="No permissions seeded" />
          )}
          {permissions.data && permissions.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <TableHead>
                  <tr>
                    <th className="px-4 py-3 sm:px-5">Code</th>
                    <th className="px-4 py-3">Description</th>
                  </tr>
                </TableHead>
                <tbody className="divide-y divide-[var(--fs-line)]">
                  {permissions.data.map((p) => (
                    <tr key={p.id} className="transition hover:bg-[var(--fs-mist)]/50">
                      <td className="px-4 py-2.5 sm:px-5 font-mono text-xs font-semibold text-[var(--fs-accent-deep)]">
                        {p.code}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-[var(--fs-muted)]">
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
    </ConsolePage>
  );
}

export default function RolesPage() {
  return (
    <RequirePermission permission={P.ROLES_LIST}>
      <RolesPanel />
    </RequirePermission>
  );
}
