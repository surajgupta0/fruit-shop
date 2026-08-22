"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "@fruitshop/web-core";

import { RequirePermission } from "@/src/components/RequirePermission";
import { P } from "@/src/console/permissions";
import {
  Btn,
  EmptyState,
  ErrorLine,
  Field,
  Input,
  LoadingLine,
  PageHeader,
  StatusPill,
  Surface,
} from "@/src/console/ui";
import { catalogApi } from "@/src/modules/catalog/api";

function CategoriesPanel() {
  const list = useQuery(() => catalogApi.listCategories(), []);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");

  const create = useMutation(() =>
    catalogApi.createCategory({
      name: name.trim(),
      parent_id: parentId || null,
      is_active: true,
    }),
  );

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    try {
      await create.mutate();
      setName("");
      setParentId("");
      await list.refetch();
    } catch {
      /* toast */
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Categories"
        description="Organize fruit into collections (mangoes, exotic, seasonal…)."
      />

      <Surface padded>
        <form onSubmit={onCreate} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[160px] flex-1">
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
          </div>
          <div className="min-w-[140px] flex-1">
            <Field label="Parent">
              <select
                className="w-full rounded-xl border border-[var(--fs-line)] px-3 py-2.5 text-sm"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
              >
                <option value="">Top level</option>
                {(list.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Btn type="submit" disabled={create.isLoading}>
            Add
          </Btn>
        </form>
      </Surface>

      <Surface>
        {list.isLoading && <LoadingLine />}
        {list.error && <ErrorLine message={list.error.message} />}
        {list.data && list.data.length === 0 && <EmptyState title="No categories yet" />}
        {list.data && list.data.length > 0 && (
          <ul className="divide-y divide-[var(--fs-line)]">
            {list.data.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-[var(--fs-muted)]">{c.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill tone={c.is_active ? "ok" : "neutral"}>
                    {c.is_active ? "Active" : "Off"}
                  </StatusPill>
                  <button
                    type="button"
                    className="text-xs text-[var(--fs-leaf)] hover:underline"
                    onClick={async () => {
                      try {
                        await catalogApi.updateCategory(c.id, { is_active: !c.is_active });
                        await list.refetch();
                      } catch {
                        /* toast */
                      }
                    }}
                  >
                    {c.is_active ? "Disable" : "Enable"}
                  </button>
                  <button
                    type="button"
                    className="text-xs text-rose-600 hover:underline"
                    onClick={async () => {
                      if (!confirm(`Delete ${c.name}?`)) return;
                      try {
                        await catalogApi.deleteCategory(c.id);
                        await list.refetch();
                      } catch {
                        /* toast */
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Surface>
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <RequirePermission permission={P.CATALOG_MANAGE}>
      <CategoriesPanel />
    </RequirePermission>
  );
}
