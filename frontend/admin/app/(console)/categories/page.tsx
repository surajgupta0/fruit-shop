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
  Select,
  StatusPill,
  Surface,
  TableSkeleton,
} from "@/src/console/ui";
import { catalogApi, type Category } from "@/src/modules/catalog/api";

function CategoriesPanel() {
  const list = useQuery(() => catalogApi.listCategories(), []);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [parentId, setParentId] = useState("");
  const [editing, setEditing] = useState<Category | null>(null);
  const [editImage, setEditImage] = useState("");

  const create = useMutation(() =>
    catalogApi.createCategory({
      name: name.trim(),
      parent_id: parentId || null,
      image_url: imageUrl.trim() || undefined,
      is_active: true,
    }),
  );

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    try {
      await create.mutate();
      setName("");
      setImageUrl("");
      setParentId("");
      await list.refetch();
    } catch {
      /* toast */
    }
  }

  async function saveImage(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    try {
      await catalogApi.updateCategory(editing.id, {
        image_url: editImage.trim() || null,
      });
      setEditing(null);
      await list.refetch();
    } catch {
      /* toast */
    }
  }

  return (
    <ConsolePage width="narrow">
      <PageHeader
        eyebrow="Catalog"
        title="Categories"
        description="Collections shown on the storefront. Add a cover image URL for better tiles."
      />

      <div className="space-y-5">
        <Panel title="Add category" description="Create a top-level or nested collection.">
          <form onSubmit={onCreate} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name">
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
              <Field label="Parent">
                <Select value={parentId} onChange={(e) => setParentId(e.target.value)}>
                  <option value="">Top level</option>
                  {(list.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Cover image URL" hint="Optional — used on storefront category tiles.">
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://…"
              />
            </Field>
            <Btn type="submit" disabled={create.isLoading || !name.trim()}>
              {create.isLoading ? "Saving…" : "Add category"}
            </Btn>
          </form>
        </Panel>

        <Surface>
          {list.isLoading && <TableSkeleton rows={5} />}
          {list.error && <ErrorLine message={list.error.message} />}
          {list.data && list.data.length === 0 && (
            <EmptyState title="No categories yet" body="Add your first collection above." />
          )}
          {list.data && list.data.length > 0 && (
            <ul className="divide-y divide-[var(--fs-line)]">
              {list.data.map((c) => (
                <li key={c.id} className="px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-[var(--fs-mist)]">
                        {c.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.image_url} alt="" className="size-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-[var(--fs-ink)]">{c.name}</p>
                        <p className="text-xs font-medium text-[var(--fs-muted)]">{c.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill tone={c.is_active ? "ok" : "neutral"}>
                        {c.is_active ? "Active" : "Off"}
                      </StatusPill>
                      <button
                        type="button"
                        className="text-xs font-bold text-[var(--fs-accent)] hover:underline"
                        onClick={() => {
                          setEditing(c);
                          setEditImage(c.image_url || "");
                        }}
                      >
                        Edit image
                      </button>
                    </div>
                  </div>
                  {editing?.id === c.id && (
                    <form onSubmit={saveImage} className="mt-3 flex flex-wrap gap-2">
                      <Input
                        value={editImage}
                        onChange={(e) => setEditImage(e.target.value)}
                        placeholder="Image URL"
                        className="min-w-[200px] flex-1"
                      />
                      <Btn type="submit" className="!py-2">
                        Save
                      </Btn>
                      <Btn type="button" variant="ghost" className="!py-2" onClick={() => setEditing(null)}>
                        Cancel
                      </Btn>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Surface>
      </div>
    </ConsolePage>
  );
}

export default function CategoriesPage() {
  return (
    <RequirePermission permission={P.CATALOG_MANAGE}>
      <CategoriesPanel />
    </RequirePermission>
  );
}
