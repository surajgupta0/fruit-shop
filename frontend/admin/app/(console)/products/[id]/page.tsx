"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery } from "@fruitshop/web-core";

import { RequirePermission } from "@/src/components/RequirePermission";
import { P } from "@/src/console/permissions";
import {
  Btn,
  Field,
  Input,
  PageHeader,
  SectionLabel,
  Select,
  StatusPill,
  Surface,
} from "@/src/console/ui";
import { catalogApi, formatPrice } from "@/src/modules/catalog/api";

function ProductDetailPanel({ productId }: { productId: string }) {
  const router = useRouter();
  const detail = useQuery(() => catalogApi.getProduct(productId), [productId]);
  const categories = useQuery(() => catalogApi.listCategories(), []);
  const brands = useQuery(() => catalogApi.listBrands(), []);
  const tags = useQuery(() => catalogApi.listTags(), []);

  const [tab, setTab] = useState<"details" | "variants" | "images">("details");
  const [form, setForm] = useState({
    name: "",
    short_description: "",
    description: "",
    status: "draft",
    visibility: "visible",
    category_id: "",
    brand_id: "",
    unit_label: "",
    badge_label: "",
    is_featured: false,
    is_organic: false,
    is_perishable: true,
    track_inventory: true,
    shelf_life_days: "",
    storage_instructions: "",
    origin_region: "",
    tag_ids: [] as string[],
  });

  const [sku, setSku] = useState("");
  const [vName, setVName] = useState("");
  const [vPrice, setVPrice] = useState("0");
  const [vStock, setVStock] = useState("0");
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    if (!detail.data) return;
    const d = detail.data;
    setForm({
      name: d.name,
      short_description: d.short_description ?? "",
      description: d.description ?? "",
      status: d.status,
      visibility: d.visibility,
      category_id: d.category_id ?? "",
      brand_id: d.brand_id ?? "",
      unit_label: d.unit_label ?? "",
      badge_label: d.badge_label ?? "",
      is_featured: d.is_featured,
      is_organic: d.is_organic,
      is_perishable: d.is_perishable,
      track_inventory: d.track_inventory,
      shelf_life_days: d.shelf_life_days != null ? String(d.shelf_life_days) : "",
      storage_instructions: d.storage_instructions ?? "",
      origin_region: d.origin_region ?? "",
      tag_ids: d.tags.map((t) => t.id),
    });
  }, [detail.data]);

  const save = useMutation(() =>
    catalogApi.updateProduct(productId, {
      name: form.name.trim(),
      short_description: form.short_description.trim() || null,
      description: form.description.trim() || null,
      status: form.status,
      visibility: form.visibility,
      category_id: form.category_id || null,
      brand_id: form.brand_id || null,
      unit_label: form.unit_label.trim() || null,
      badge_label: form.badge_label.trim() || null,
      is_featured: form.is_featured,
      is_organic: form.is_organic,
      is_perishable: form.is_perishable,
      track_inventory: form.track_inventory,
      shelf_life_days: form.shelf_life_days ? Number(form.shelf_life_days) : null,
      storage_instructions: form.storage_instructions.trim() || null,
      origin_region: form.origin_region.trim() || null,
      tag_ids: form.tag_ids,
    }),
  );

  const remove = useMutation(() => catalogApi.deleteProduct(productId));
  const addVariant = useMutation(() =>
    catalogApi.addVariant(productId, {
      sku: sku.trim(),
      name: vName.trim(),
      price: Number(vPrice) || 0,
      stock_qty: Number(vStock) || 0,
      is_active: true,
    }),
  );
  const addImage = useMutation(() =>
    catalogApi.addImage(productId, {
      url: imageUrl.trim(),
      alt_text: form.name,
      is_primary: (detail.data?.images.length ?? 0) === 0,
    }),
  );

  if (detail.isLoading) {
    return <p className="text-sm text-[var(--fs-muted)]">Loading product…</p>;
  }
  if (detail.error || !detail.data) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-rose-600">{detail.error?.message ?? "Not found"}</p>
        <Link href="/products" className="text-sm text-[var(--fs-leaf)]">
          Back to products
        </Link>
      </div>
    );
  }

  const p = detail.data;

  async function onSave(e: FormEvent) {
    e.preventDefault();
    try {
      await save.mutate();
      await detail.refetch();
    } catch {
      /* toast */
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        breadcrumb={
          <Link
            href="/products"
            className="mb-2 inline-block text-sm text-[var(--fs-muted)] hover:text-[var(--fs-leaf)]"
          >
            ← Products
          </Link>
        }
        title={p.name}
        description={p.slug}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill
              tone={p.status === "active" ? "ok" : p.status === "draft" ? "warn" : "neutral"}
            >
              {p.status}
            </StatusPill>
            <Btn
              variant="danger"
              onClick={async () => {
                if (!confirm("Delete this product?")) return;
                try {
                  await remove.mutate();
                  router.push("/products");
                } catch {
                  /* toast */
                }
              }}
            >
              Delete
            </Btn>
          </div>
        }
      />

      <div className="flex gap-1 rounded-xl border border-[var(--fs-line)] bg-white p-1">
        {(
          [
            ["details", "Details"],
            ["variants", "Variants & stock"],
            ["images", "Images"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === id
                ? "bg-[var(--fs-mist)] text-[var(--fs-leaf-deep)]"
                : "text-[var(--fs-muted)] hover:text-[var(--fs-ink)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "details" && (
        <form onSubmit={onSave} className="space-y-4">
          <Surface padded>
            <SectionLabel>Listing</SectionLabel>
            <div className="space-y-3.5">
              <Field label="Name">
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Short description">
                <Input
                  value={form.short_description}
                  onChange={(e) => setForm((f) => ({ ...f, short_description: e.target.value }))}
                />
              </Field>
              <Field label="Description">
                <textarea
                  className="w-full rounded-xl border border-[var(--fs-line)] px-3 py-2.5 text-sm outline-none focus:border-[var(--fs-leaf)]"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Status">
                  <Select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </Select>
                </Field>
                <Field label="Visibility">
                  <Select
                    value={form.visibility}
                    onChange={(e) => setForm((f) => ({ ...f, visibility: e.target.value }))}
                  >
                    <option value="visible">Visible</option>
                    <option value="catalog">Catalog</option>
                    <option value="search">Search</option>
                    <option value="hidden">Hidden</option>
                  </Select>
                </Field>
                <Field label="Category">
                  <Select
                    value={form.category_id}
                    onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                  >
                    <option value="">None</option>
                    {(categories.data ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Brand">
                  <Select
                    value={form.brand_id}
                    onChange={(e) => setForm((f) => ({ ...f, brand_id: e.target.value }))}
                  >
                    <option value="">None</option>
                    {(brands.data ?? []).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Unit">
                  <Input
                    value={form.unit_label}
                    onChange={(e) => setForm((f) => ({ ...f, unit_label: e.target.value }))}
                  />
                </Field>
                <Field label="Badge">
                  <Input
                    value={form.badge_label}
                    onChange={(e) => setForm((f) => ({ ...f, badge_label: e.target.value }))}
                    placeholder="Sale / New"
                  />
                </Field>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                {(
                  [
                    ["is_featured", "Featured"],
                    ["is_organic", "Organic"],
                    ["is_perishable", "Perishable"],
                    ["track_inventory", "Track inventory"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </Surface>

          <Surface padded>
            <SectionLabel>Produce & storage</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Shelf life (days)">
                <Input
                  type="number"
                  min={0}
                  value={form.shelf_life_days}
                  onChange={(e) => setForm((f) => ({ ...f, shelf_life_days: e.target.value }))}
                />
              </Field>
              <Field label="Origin region">
                <Input
                  value={form.origin_region}
                  onChange={(e) => setForm((f) => ({ ...f, origin_region: e.target.value }))}
                />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Storage instructions">
                <Input
                  value={form.storage_instructions}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, storage_instructions: e.target.value }))
                  }
                />
              </Field>
            </div>
          </Surface>

          <Surface padded>
            <SectionLabel>Tags</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {(tags.data ?? []).map((t) => {
                const on = form.tag_ids.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        tag_ids: on
                          ? f.tag_ids.filter((id) => id !== t.id)
                          : [...f.tag_ids, t.id],
                      }))
                    }
                    className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
                      on
                        ? "bg-[var(--fs-mist)] text-[var(--fs-leaf-deep)] ring-[var(--fs-leaf)]/30"
                        : "bg-white text-[var(--fs-muted)] ring-[var(--fs-line)]"
                    }`}
                  >
                    {t.name}
                  </button>
                );
              })}
              {!tags.data?.length && (
                <p className="text-sm text-[var(--fs-muted)]">
                  No tags yet — create some under Tags.
                </p>
              )}
            </div>
          </Surface>

          <Btn type="submit" disabled={save.isLoading}>
            {save.isLoading ? "Saving…" : "Save details"}
          </Btn>
        </form>
      )}

      {tab === "variants" && (
        <div className="space-y-4">
          <Surface>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--fs-line)] bg-[var(--fs-mist)]/50 text-[11px] uppercase text-[var(--fs-muted)]">
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--fs-line)]">
                  {p.variants.map((v) => (
                    <tr key={v.id}>
                      <td className="px-4 py-3 font-mono text-xs">{v.sku}</td>
                      <td className="px-4 py-3">{v.name}</td>
                      <td className="px-4 py-3">{formatPrice(v.price)}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          className="w-20 rounded-lg border border-[var(--fs-line)] px-2 py-1"
                          defaultValue={v.stock_qty}
                          onBlur={async (e) => {
                            const next = Number(e.target.value);
                            if (Number.isNaN(next) || next === v.stock_qty) return;
                            try {
                              await catalogApi.updateVariant(productId, v.id, {
                                stock_qty: next,
                              });
                              await detail.refetch();
                            } catch {
                              /* toast */
                            }
                          }}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className="text-xs text-rose-600 hover:underline"
                          onClick={async () => {
                            if (!confirm("Remove variant?")) return;
                            try {
                              await catalogApi.deleteVariant(productId, v.id);
                              await detail.refetch();
                            } catch {
                              /* toast */
                            }
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Surface>

          <Surface padded>
            <SectionLabel>Add variant</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="SKU">
                <Input value={sku} onChange={(e) => setSku(e.target.value)} required />
              </Field>
              <Field label="Name">
                <Input value={vName} onChange={(e) => setVName(e.target.value)} required />
              </Field>
              <Field label="Price">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={vPrice}
                  onChange={(e) => setVPrice(e.target.value)}
                />
              </Field>
              <Field label="Stock">
                <Input
                  type="number"
                  min={0}
                  value={vStock}
                  onChange={(e) => setVStock(e.target.value)}
                />
              </Field>
            </div>
            <Btn
              className="mt-3"
              disabled={addVariant.isLoading || !sku.trim() || !vName.trim()}
              onClick={async () => {
                try {
                  await addVariant.mutate();
                  setSku("");
                  setVName("");
                  setVPrice("0");
                  setVStock("0");
                  await detail.refetch();
                } catch {
                  /* toast */
                }
              }}
            >
              {addVariant.isLoading ? "Adding…" : "Add variant"}
            </Btn>
          </Surface>
        </div>
      )}

      {tab === "images" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {p.images.map((img) => (
              <Surface key={img.id} className="overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.alt_text ?? ""} className="aspect-[4/3] w-full object-cover" />
                <div className="flex items-center justify-between gap-2 p-3 text-xs">
                  <span>{img.is_primary ? "Primary" : "Gallery"}</span>
                  <button
                    type="button"
                    className="text-rose-600 hover:underline"
                    onClick={async () => {
                      try {
                        await catalogApi.deleteImage(productId, img.id);
                        await detail.refetch();
                      } catch {
                        /* toast */
                      }
                    }}
                  >
                    Remove
                  </button>
                </div>
              </Surface>
            ))}
          </div>
          <Surface padded>
            <SectionLabel>Add image URL</SectionLabel>
            <div className="flex flex-wrap gap-2">
              <div className="min-w-[200px] flex-1">
                <Input
                  type="url"
                  placeholder="https://…"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>
              <Btn
                disabled={addImage.isLoading || !imageUrl.trim()}
                onClick={async () => {
                  try {
                    await addImage.mutate();
                    setImageUrl("");
                    await detail.refetch();
                  } catch {
                    /* toast */
                  }
                }}
              >
                Add
              </Btn>
            </div>
          </Surface>
        </div>
      )}
    </div>
  );
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  return (
    <RequirePermission permission={P.CATALOG_MANAGE}>
      <ProductDetailPanel productId={params.id} />
    </RequirePermission>
  );
}
