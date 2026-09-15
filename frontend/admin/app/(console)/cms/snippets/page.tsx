"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery } from "@fruitshop/web-core";

import { RequirePermission } from "@/src/components/RequirePermission";
import { P } from "@/src/console/permissions";
import {
  Btn,
  ConsolePage,
  EmptyState,
  ErrorLine,
  Field,
  Input,
  PageHeader,
  Pagination,
  Panel,
  Select,
  StatusPill,
  Surface,
  TableHead,
  TableSkeleton,
  Toolbar,
} from "@/src/console/ui";
import { cmsApi, type SnippetInput } from "@/src/modules/cms/api";

const emptyForm: SnippetInput = {
  key: "",
  title: "",
  body: "",
  href: "",
  href_label: "",
  is_active: true,
};

function SnippetsPanel() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<SnippetInput>(emptyForm);

  const params = useMemo(
    () => ({
      page,
      page_size: 30,
      search: search.trim() || undefined,
    }),
    [page, search],
  );
  const list = useQuery(() => cmsApi.listSnippets(params), [params]);
  const create = useMutation(() =>
    cmsApi.createSnippet({
      key: form.key.trim(),
      title: form.title.trim(),
      body: form.body?.trim() || null,
      href: form.href?.trim() || null,
      href_label: form.href_label?.trim() || null,
      is_active: form.is_active,
    }),
  );

  const totalPages = list.data
    ? Math.max(1, Math.ceil(list.data.total / list.data.page_size))
    : 1;

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    try {
      await create.mutate();
      setForm(emptyForm);
      await list.refetch();
    } catch {
      /* toast */
    }
  }

  return (
    <ConsolePage>
      <PageHeader
        eyebrow="Content"
        title="Snippets"
        description="Reusable copy — announcement bar, footer notes, and more."
      />

      <Panel
        title="New snippet"
        description="Use key announcement_bar for the storefront promo strip."
      >
        <form onSubmit={onCreate} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Key">
              <Input
                value={form.key}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                placeholder="announcement_bar"
                required
              />
            </Field>
            <Field label="Title">
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </Field>
            <Field label="Body">
              <Input
                value={form.body ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              />
            </Field>
            <Field label="Active">
              <Select
                value={form.is_active ? "1" : "0"}
                onChange={(e) =>
                  setForm((f) => ({ ...f, is_active: e.target.value === "1" }))
                }
              >
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </Select>
            </Field>
            <Field label="Link href">
              <Input
                value={form.href ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, href: e.target.value }))}
              />
            </Field>
            <Field label="Link label">
              <Input
                value={form.href_label ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, href_label: e.target.value }))}
              />
            </Field>
          </div>
          <Btn type="submit" disabled={create.isLoading || !form.key.trim() || !form.title.trim()}>
            {create.isLoading ? "Creating…" : "Create snippet"}
          </Btn>
        </form>
      </Panel>

      <Toolbar>
        <Input
          type="search"
          placeholder="Search key or title…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="sm:min-w-[220px] sm:flex-1"
        />
      </Toolbar>

      <Surface>
        {list.isLoading && <TableSkeleton rows={6} />}
        {list.error && <ErrorLine message={list.error.message} />}
        {list.data && list.data.items.length === 0 && (
          <EmptyState title="No snippets" body="Create announcement_bar to power the promo strip." />
        )}
        {list.data && list.data.items.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <TableHead>
                  <tr>
                    <th className="px-4 py-3 sm:px-5">Snippet</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </TableHead>
                <tbody className="divide-y divide-[var(--fs-line)]">
                  {list.data.items.map((s) => (
                    <tr key={s.id} className="transition hover:bg-[var(--fs-mist)]/50">
                      <td className="px-4 py-3.5 sm:px-5">
                        <p className="font-extrabold">{s.title}</p>
                        <p className="font-mono text-xs text-[var(--fs-muted)]">{s.key}</p>
                        {s.body ? (
                          <p className="mt-1 text-sm font-medium text-[var(--fs-muted)]">
                            {s.body}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusPill tone={s.is_active ? "ok" : "neutral"}>
                          {s.is_active ? "Active" : "Off"}
                        </StatusPill>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          className="mr-3 text-xs font-extrabold text-[var(--fs-accent-deep)] hover:underline"
                          onClick={async () => {
                            try {
                              await cmsApi.updateSnippet(s.id, {
                                is_active: !s.is_active,
                              });
                              await list.refetch();
                            } catch {
                              /* toast */
                            }
                          }}
                        >
                          {s.is_active ? "Disable" : "Enable"}
                        </button>
                        <button
                          type="button"
                          className="text-xs font-extrabold text-[var(--fs-danger)] hover:underline"
                          onClick={async () => {
                            if (!confirm(`Delete “${s.key}”?`)) return;
                            try {
                              await cmsApi.deleteSnippet(s.id);
                              await list.refetch();
                            } catch {
                              /* toast */
                            }
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={list.data.page}
              totalPages={totalPages}
              total={list.data.total}
              onPrev={() => setPage((p) => p - 1)}
              onNext={() => setPage((p) => p + 1)}
            />
          </>
        )}
      </Surface>
    </ConsolePage>
  );
}

export default function CmsSnippetsPage() {
  return (
    <RequirePermission permission={P.CMS_MANAGE}>
      <SnippetsPanel />
    </RequirePermission>
  );
}
