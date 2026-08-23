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
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Categories"
        description="Add a cover image URL so the storefront shows appetizing category tiles."
      />

      <Surface padded>
        <form onSubmit={onCreate} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
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
          <Field label="Cover image URL" hint="Paste a CDN/Unsplash URL (shown on the home page)">
            <Input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
            />
          </Field>
          <Btn type="submit" disabled={create.isLoading}>
            Add category
          </Btn>
        </form>
      </Surface>

      {editing && (
        <Surface padded>
          <form onSubmit={saveImage} className="space-y-3">
            <p className="font-medium">Update image · {editing.name}</p>
            <Field label="Image URL">
              <Input
                type="url"
                value={editImage}
                onChange={(e) => setEditImage(e.target.value)}
                placeholder="https://…"
              />
            </Field>
            {editImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={editImage}
                alt=""
                className="h-28 w-full rounded-xl object-cover ring-1 ring-[var(--fs-line)]"
              />
            )}
            <div className="flex gap-2">
              <Btn type="submit">Save image</Btn>
              <Btn type="button" variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Btn>
            </div>
          </form>
        </Surface>
      )}

      <Surface>
        {list.isLoading && <LoadingLine />}
        {list.error && <ErrorLine message={list.error.message} />}
        {list.data && list.data.length === 0 && <EmptyState title="No categories yet" />}
        {list.data && list.data.length > 0 && (
          <ul className="divide-y divide-[var(--fs-line)]">
            {list.data.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-[var(--fs-mist)]">
                  {c.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image_url} alt="" className="size-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c.name}</p>
                  <p className="truncate text-xs text-[var(--fs-muted)]">{c.slug}</p>
                </div>
                <StatusPill tone={c.is_active ? "ok" : "neutral"}>
                  {c.is_active ? "Active" : "Off"}
                </StatusPill>
                <button
                  type="button"
                  className="text-xs text-[var(--fs-leaf)] hover:underline"
                  onClick={() => {
                    setEditing(c);
                    setEditImage(c.image_url || "");
                  }}
                >
                  Image
                </button>
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
