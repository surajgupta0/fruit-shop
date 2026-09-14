"use client";

import { FormEvent, useState } from "react";
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
  Panel,
  Surface,
  TableSkeleton,
} from "@/src/console/ui";
import { catalogApi } from "@/src/modules/catalog/api";

function TagsPanel() {
  const list = useQuery(() => catalogApi.listTags(), []);
  const [name, setName] = useState("");

  const create = useMutation(() => catalogApi.createTag({ name: name.trim() }));

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    try {
      await create.mutate();
      setName("");
      await list.refetch();
    } catch {
      /* toast */
    }
  }

  return (
    <ConsolePage width="narrow">
      <PageHeader
        eyebrow="Catalog"
        title="Tags"
        description="Labels like seasonal, organic, or gift — attach them on product details."
      />

      <div className="space-y-5">
        <Panel title="Add tag">
          <form onSubmit={onCreate} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1">
              <Field label="Tag name">
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
            </div>
            <Btn type="submit" disabled={create.isLoading || !name.trim()}>
              {create.isLoading ? "Adding…" : "Add tag"}
            </Btn>
          </form>
        </Panel>

        <Surface>
          {list.isLoading && <TableSkeleton rows={4} />}
          {list.error && <ErrorLine message={list.error.message} />}
          {list.data && list.data.length === 0 && (
            <EmptyState title="No tags yet" body="Create filter labels for the shop." />
          )}
          {list.data && list.data.length > 0 && (
            <ul className="flex flex-wrap gap-2 p-5">
              {list.data.map((t) => (
                <li
                  key={t.id}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--fs-mist)] px-3.5 py-1.5 text-sm font-bold text-[var(--fs-accent-deep)]"
                >
                  {t.name}
                  <button
                    type="button"
                    className="text-rose-600 hover:underline"
                    onClick={async () => {
                      if (!confirm(`Delete tag ${t.name}?`)) return;
                      try {
                        await catalogApi.deleteTag(t.id);
                        await list.refetch();
                      } catch {
                        /* toast */
                      }
                    }}
                    aria-label={`Delete ${t.name}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Surface>
      </div>
    </ConsolePage>
  );
}

export default function TagsPage() {
  return (
    <RequirePermission permission={P.CATALOG_MANAGE}>
      <TagsPanel />
    </RequirePermission>
  );
}
