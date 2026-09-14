"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth, useMutation, useQuery } from "@fruitshop/web-core";

import { Can, RequirePermission } from "@/src/components/RequirePermission";
import { P } from "@/src/console/permissions";
import {
  Btn,
  Field,
  Input,
  PageHeader,
  PageLoader,
  SectionLabel,
  Select,
  StatusPill,
  Surface,
} from "@/src/console/ui";
import { usersApi, type UserRole } from "@/src/modules/users/api";

function UserDetailPanel({ userId }: { userId: string }) {
  const { hasPermission, hasRole, user: me } = useAuth();
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
    return <PageLoader title="Loading user" detail="Fetching profile, role, and account status…" />;
  }
  if (detail.error || !detail.data) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-rose-600">{detail.error?.message ?? "User not found"}</p>
        <Link href="/users" className="text-sm font-bold text-[var(--fs-accent)] hover:underline">
          Back to users
        </Link>
      </div>
    );
  }

  const u = detail.data;
  const isSelf = me?.id === u.id;
  const canUpdate = hasPermission(P.USERS_UPDATE);
  const canChangeRole = hasPermission(P.USERS_CHANGE_ROLE);
  const canDeactivate = hasPermission(P.USERS_DEACTIVATE) && !isSelf;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        breadcrumb={
          <Can permission={P.USERS_LIST}>
            <Link
              href="/users"
              className="mb-2 inline-block text-sm text-[var(--fs-muted)] hover:text-[var(--fs-accent)]"
            >
              ← Users
            </Link>
          </Can>
        }
        title={u.name}
        description={`${u.role}${isSelf ? " · you" : ""} · ${u.email || u.phone}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={u.is_active ? "ok" : "neutral"}>
              {u.is_active ? "Active" : "Inactive"}
            </StatusPill>
            {canDeactivate ? (
              <Btn
                variant={u.is_active ? "danger" : "secondary"}
                disabled={saveStatus.isLoading}
                onClick={async () => {
                  try {
                    await saveStatus.mutate(!u.is_active);
                    await detail.refetch();
                  } catch {
                    /* toast */
                  }
                }}
              >
                {u.is_active ? "Deactivate" : "Activate"}
              </Btn>
            ) : null}
          </div>
        }
      />

      {canUpdate ? (
        <Surface padded>
          <SectionLabel>Profile</SectionLabel>
          <form
            className="space-y-3.5"
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
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Phone">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </Field>
            <Btn type="submit" disabled={saveProfile.isLoading}>
              {saveProfile.isLoading ? "Saving…" : "Save profile"}
            </Btn>
          </form>
        </Surface>
      ) : (
        <Surface padded>
          <SectionLabel>Profile</SectionLabel>
          <dl className="mt-2 space-y-2 text-sm">
            <div>
              <dt className="text-[var(--fs-muted)]">Name</dt>
              <dd className="font-medium">{u.name}</dd>
            </div>
            <div>
              <dt className="text-[var(--fs-muted)]">Email</dt>
              <dd>{u.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--fs-muted)]">Phone</dt>
              <dd>{u.phone}</dd>
            </div>
          </dl>
        </Surface>
      )}

      {canChangeRole ? (
        <Surface padded>
          <SectionLabel>Role</SectionLabel>
          <form
            className="flex flex-wrap items-end gap-3"
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
            <div className="min-w-[160px] flex-1">
              <Field label="Assigned role">
                <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                  <option value="customer">Customer</option>
                  <option value="staff">Staff</option>
                  {hasRole("admin") ? <option value="admin">Admin</option> : null}
                </Select>
              </Field>
            </div>
            <Btn type="submit" variant="secondary" disabled={saveRole.isLoading}>
              {saveRole.isLoading ? "Updating…" : "Update role"}
            </Btn>
          </form>
        </Surface>
      ) : (
        <Surface padded>
          <SectionLabel>Role</SectionLabel>
          <p className="capitalize text-sm font-medium">{u.role}</p>
        </Surface>
      )}

      <Can permission={P.USERS_UPDATE}>
        <Surface padded>
          <SectionLabel>Reset password</SectionLabel>
          <p className="mb-3 text-sm text-[var(--fs-muted)]">
            Minimum 8 characters. Used for staff/admin email login.
          </p>
          <form
            className="flex flex-wrap items-end gap-3"
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
            <div className="min-w-[180px] flex-1">
              <Field label="New password">
                <Input
                  type="password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
            </div>
            <Btn type="submit" variant="secondary" disabled={savePassword.isLoading}>
              {savePassword.isLoading ? "Saving…" : "Set password"}
            </Btn>
          </form>
        </Surface>
      </Can>

      <Surface padded>
        <SectionLabel>Effective permissions</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {u.permissions.map((code) => (
            <code
              key={code}
              className="rounded-md bg-[var(--fs-mist)] px-2 py-1 font-mono text-[11px] text-[var(--fs-accent-deep)]"
            >
              {code}
            </code>
          ))}
          {!u.permissions.length && (
            <p className="text-sm text-[var(--fs-muted)]">None attached to this role.</p>
          )}
        </div>
      </Surface>
    </div>
  );
}

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  return (
    <RequirePermission anyOf={[P.USERS_READ, P.USERS_LIST]}>
      <UserDetailPanel userId={params.id} />
    </RequirePermission>
  );
}
