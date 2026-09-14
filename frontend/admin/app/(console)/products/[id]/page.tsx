"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
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
import {
  catalogApi,
  formatPrice,
  type RelationType,
} from "@/src/modules/catalog/api";

type Tab = "details" | "variants" | "options" | "attributes" | "images" | "related";

function ProductDetailPanel({ productId }: { productId: string }) {
  const router = useRouter();
  const detail = useQuery(() => catalogApi.getProduct(productId), [productId]);
  const categories = useQuery(() => catalogApi.listCategories(), []);
  const brands = useQuery(() => catalogApi.listBrands(), []);
  const tags = useQuery(() => catalogApi.listTags(), []);
  const relatedPicker = useQuery(
    () => catalogApi.listProducts({ page: 1, page_size: 50, status: "active" }),
    [],
  );

  const [tab, setTab] = useState<Tab>("details");
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

  const [optionName, setOptionName] = useState("");
  const [optionValues, setOptionValues] = useState("");
  const [valueDrafts, setValueDrafts] = useState<Record<string, string>>({});

  const [attrName, setAttrName] = useState("");
  const [attrValue, setAttrValue] = useState("");

  const [relatedId, setRelatedId] = useState("");
  const [relationType, setRelationType] = useState<RelationType>("related");

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
  const publish = useMutation(() => catalogApi.publishProduct(productId));
  const unpublish = useMutation(() => catalogApi.unpublishProduct(productId));
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

  const sortedImages = useMemo(() => {
    const images = detail.data?.images ?? [];
    return [...images].sort((a, b) => a.sort_order - b.sort_order);
  }, [detail.data?.images]);

  const relatedChoices = useMemo(() => {
    return (relatedPicker.data?.items ?? []).filter((item) => item.id !== productId);
  }, [relatedPicker.data, productId]);

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
  const options = p.options ?? [];
  const attributes = p.attributes ?? [];
  const relations = p.relations ?? [];

  async function onSave(e: FormEvent) {
    e.preventDefault();
    try {
      await save.mutate();
      await detail.refetch();
    } catch {
      /* toast */
    }
  }

  async function moveImage(imageId: string, direction: -1 | 1) {
    const ordered = [...sortedImages];
    const index = ordered.findIndex((img) => img.id === imageId);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= ordered.length) return;
    const swapped = [...ordered];
    [swapped[index], swapped[next]] = [swapped[next], swapped[index]];
    try {
      await catalogApi.reorderImages(
        productId,
        swapped.map((img, sort_order) => ({
          id: img.id,
          sort_order,
          is_primary: img.is_primary,
        })),
      );
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
            {p.status === "active" ? (
              <Btn
                variant="ghost"
                disabled={unpublish.isLoading}
                onClick={async () => {
                  try {
                    await unpublish.mutate();
                    await detail.refetch();
                  } catch {
                    /* toast */
                  }
                }}
              >
                {unpublish.isLoading ? "…" : "Unpublish"}
              </Btn>
            ) : (
              <Btn
                disabled={publish.isLoading || p.variants.length === 0}
                title={p.variants.length === 0 ? "Add a variant before publishing" : undefined}
                onClick={async () => {
                  try {
                    await publish.mutate();
                    await detail.refetch();
                  } catch {
                    /* toast */
                  }
                }}
              >
                {publish.isLoading ? "…" : "Publish"}
              </Btn>
            )}
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

      <div className="flex flex-wrap gap-1 rounded-xl border border-[var(--fs-line)] bg-white p-1">
        {(
          [
            ["details", "Details"],
            ["variants", "Variants"],
            ["options", "Options"],
            ["attributes", "Attributes"],
            ["images", "Images"],
            ["related", "Related"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
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

      {tab === "options" && (
        <div className="space-y-4">
          {options.map((opt) => (
            <Surface key={opt.id} padded>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-[var(--fs-ink)]">{opt.name}</p>
                  <p className="text-xs text-[var(--fs-muted)]">Position {opt.position}</p>
                </div>
                <button
                  type="button"
                  className="text-xs text-rose-600 hover:underline"
                  onClick={async () => {
                    if (!confirm(`Remove option “${opt.name}”?`)) return;
                    try {
                      await catalogApi.deleteOption(productId, opt.id);
                      await detail.refetch();
                    } catch {
                      /* toast */
                    }
                  }}
                >
                  Remove
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {opt.values.map((val) => (
                  <span
                    key={val.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[var(--fs-mist)] px-2.5 py-1 text-xs text-[var(--fs-leaf-deep)]"
                  >
                    {val.value}
                    <button
                      type="button"
                      className="text-[var(--fs-muted)] hover:text-rose-600"
                      aria-label={`Remove ${val.value}`}
                      onClick={async () => {
                        try {
                          await catalogApi.deleteOptionValue(productId, opt.id, val.id);
                          await detail.refetch();
                        } catch {
                          /* toast */
                        }
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <div className="min-w-[160px] flex-1">
                  <Input
                    placeholder="Add value…"
                    value={valueDrafts[opt.id] ?? ""}
                    onChange={(e) =>
                      setValueDrafts((d) => ({ ...d, [opt.id]: e.target.value }))
                    }
                  />
                </div>
                <Btn
                  disabled={!((valueDrafts[opt.id] ?? "").trim())}
                  onClick={async () => {
                    const value = (valueDrafts[opt.id] ?? "").trim();
                    if (!value) return;
                    try {
                      await catalogApi.addOptionValue(productId, opt.id, { value });
                      setValueDrafts((d) => ({ ...d, [opt.id]: "" }));
                      await detail.refetch();
                    } catch {
                      /* toast */
                    }
                  }}
                >
                  Add value
                </Btn>
              </div>
            </Surface>
          ))}

          {!options.length && (
            <Surface padded>
              <p className="text-sm text-[var(--fs-muted)]">
                No options yet. Add Size, Pack, or Grade (max 3).
              </p>
            </Surface>
          )}

          {options.length < 3 && (
            <Surface padded>
              <SectionLabel>Add option</SectionLabel>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name">
                  <Input
                    value={optionName}
                    onChange={(e) => setOptionName(e.target.value)}
                    placeholder="Size"
                  />
                </Field>
                <Field label="Values (comma-separated)">
                  <Input
                    value={optionValues}
                    onChange={(e) => setOptionValues(e.target.value)}
                    placeholder="Small, Medium, Large"
                  />
                </Field>
              </div>
              <Btn
                className="mt-3"
                disabled={!optionName.trim()}
                onClick={async () => {
                  const values = optionValues
                    .split(",")
                    .map((v) => v.trim())
                    .filter(Boolean)
                    .map((value, sort_order) => ({ value, sort_order }));
                  try {
                    await catalogApi.addOption(productId, {
                      name: optionName.trim(),
                      position: options.length + 1,
                      values,
                    });
                    setOptionName("");
                    setOptionValues("");
                    await detail.refetch();
                  } catch {
                    /* toast */
                  }
                }}
              >
                Add option
              </Btn>
            </Surface>
          )}
        </div>
      )}

      {tab === "attributes" && (
        <div className="space-y-4">
          <Surface>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--fs-line)] bg-[var(--fs-mist)]/50 text-[11px] uppercase text-[var(--fs-muted)]">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Value</th>
                    <th className="px-4 py-3">Visible</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--fs-line)]">
                  {attributes.map((attr) => (
                    <tr key={attr.id}>
                      <td className="px-4 py-3">{attr.name}</td>
                      <td className="px-4 py-3">{attr.value}</td>
                      <td className="px-4 py-3">{attr.is_visible ? "Yes" : "No"}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className="text-xs text-rose-600 hover:underline"
                          onClick={async () => {
                            try {
                              await catalogApi.deleteAttribute(productId, attr.id);
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
                  {!attributes.length && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-sm text-[var(--fs-muted)]">
                        No attributes yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Surface>

          <Surface padded>
            <SectionLabel>Add attribute</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name">
                <Input
                  value={attrName}
                  onChange={(e) => setAttrName(e.target.value)}
                  placeholder="Origin"
                />
              </Field>
              <Field label="Value">
                <Input
                  value={attrValue}
                  onChange={(e) => setAttrValue(e.target.value)}
                  placeholder="Ratnagiri"
                />
              </Field>
            </div>
            <Btn
              className="mt-3"
              disabled={!attrName.trim() || !attrValue.trim()}
              onClick={async () => {
                try {
                  await catalogApi.addAttribute(productId, {
                    name: attrName.trim(),
                    value: attrValue.trim(),
                    is_visible: true,
                  });
                  setAttrName("");
                  setAttrValue("");
                  await detail.refetch();
                } catch {
                  /* toast */
                }
              }}
            >
              Add attribute
            </Btn>
          </Surface>
        </div>
      )}

      {tab === "images" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {sortedImages.map((img, index) => (
              <Surface key={img.id} className="overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.alt_text ?? ""}
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="space-y-2 p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
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
                  <div className="flex flex-wrap gap-2">
                    {!img.is_primary && (
                      <button
                        type="button"
                        className="text-[var(--fs-leaf)] hover:underline"
                        onClick={async () => {
                          try {
                            await catalogApi.reorderImages(
                              productId,
                              sortedImages.map((item, sort_order) => ({
                                id: item.id,
                                sort_order,
                                is_primary: item.id === img.id,
                              })),
                            );
                            await detail.refetch();
                          } catch {
                            /* toast */
                          }
                        }}
                      >
                        Set primary
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-[var(--fs-muted)] hover:text-[var(--fs-ink)] disabled:opacity-40"
                      disabled={index === 0}
                      onClick={() => moveImage(img.id, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="text-[var(--fs-muted)] hover:text-[var(--fs-ink)] disabled:opacity-40"
                      disabled={index === sortedImages.length - 1}
                      onClick={() => moveImage(img.id, 1)}
                    >
                      ↓
                    </button>
                  </div>
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

      {tab === "related" && (
        <div className="space-y-4">
          <Surface>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--fs-line)] bg-[var(--fs-mist)]/50 text-[11px] uppercase text-[var(--fs-muted)]">
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--fs-line)]">
                  {relations.map((rel) => (
                    <tr key={rel.id}>
                      <td className="px-4 py-3">
                        <Link
                          href={`/products/${rel.related_product_id}`}
                          className="font-medium hover:text-[var(--fs-leaf)]"
                        >
                          {rel.related_name ?? rel.related_product_id}
                        </Link>
                      </td>
                      <td className="px-4 py-3 capitalize">
                        {String(rel.relation_type).replaceAll("_", " ")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className="text-xs text-rose-600 hover:underline"
                          onClick={async () => {
                            try {
                              await catalogApi.deleteRelation(productId, rel.id);
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
                  {!relations.length && (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-sm text-[var(--fs-muted)]">
                        No related products yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Surface>

          <Surface padded>
            <SectionLabel>Add relation</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Product">
                <Select value={relatedId} onChange={(e) => setRelatedId(e.target.value)}>
                  <option value="">Select…</option>
                  {relatedChoices.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Type">
                <Select
                  value={relationType}
                  onChange={(e) => setRelationType(e.target.value as RelationType)}
                >
                  <option value="related">Related</option>
                  <option value="upsell">Upsell</option>
                  <option value="cross_sell">Cross-sell</option>
                  <option value="bundle">Bundle</option>
                  <option value="variant_group">Variant group</option>
                </Select>
              </Field>
            </div>
            <Btn
              className="mt-3"
              disabled={!relatedId}
              onClick={async () => {
                try {
                  await catalogApi.addRelation(productId, {
                    related_product_id: relatedId,
                    relation_type: relationType,
                  });
                  setRelatedId("");
                  await detail.refetch();
                } catch {
                  /* toast */
                }
              }}
            >
              Add relation
            </Btn>
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
