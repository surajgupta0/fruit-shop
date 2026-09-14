"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
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
  Surface,
} from "@/src/console/ui";
import {
  catalogApi,
  type ProductStatus,
  type ProductVisibility,
} from "@/src/modules/catalog/api";

type DraftVariant = {
  key: string;
  sku: string;
  name: string;
  price: string;
  stock: string;
  is_default: boolean;
};

type DraftImage = {
  key: string;
  url: string;
  is_primary: boolean;
};

function NewProductPanel() {
  const router = useRouter();
  const categories = useQuery(() => catalogApi.listCategories(), []);
  const brands = useQuery(() => catalogApi.listBrands(), []);
  const tags = useQuery(() => catalogApi.listTags(), []);

  const [tab, setTab] = useState<"details" | "variants" | "images">("details");
  const [form, setForm] = useState({
    name: "",
    short_description: "",
    description: "",
    status: "draft" as ProductStatus,
    visibility: "visible" as ProductVisibility,
    category_id: "",
    brand_id: "",
    unit_label: "kg",
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

  const [variants, setVariants] = useState<DraftVariant[]>([
    {
      key: "default",
      sku: "",
      name: "Default",
      price: "0",
      stock: "0",
      is_default: true,
    },
  ]);
  const [images, setImages] = useState<DraftImage[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");

  const [vSku, setVSku] = useState("");
  const [vName, setVName] = useState("");
  const [vPrice, setVPrice] = useState("0");
  const [vStock, setVStock] = useState("0");

  const create = useMutation(() => {
    const preparedVariants = variants.map((v, i) => ({
      sku: v.sku.trim() || `SKU-${Date.now().toString(36).toUpperCase()}-${i + 1}`,
      name: v.name.trim() || form.name.trim() || "Default",
      price: Number(v.price) || 0,
      stock_qty: Number(v.stock) || 0,
      is_default: v.is_default,
      is_active: true,
    }));

    return catalogApi.createProduct({
      name: form.name.trim(),
      short_description: form.short_description.trim() || undefined,
      description: form.description.trim() || undefined,
      category_id: form.category_id || null,
      brand_id: form.brand_id || null,
      status: form.status,
      visibility: form.visibility,
      unit_label: form.unit_label.trim() || undefined,
      badge_label: form.badge_label.trim() || undefined,
      is_organic: form.is_organic,
      is_featured: form.is_featured,
      is_perishable: form.is_perishable,
      track_inventory: form.track_inventory,
      shelf_life_days: form.shelf_life_days ? Number(form.shelf_life_days) : undefined,
      storage_instructions: form.storage_instructions.trim() || undefined,
      origin_region: form.origin_region.trim() || undefined,
      tag_ids: form.tag_ids,
      product_type: preparedVariants.length > 1 ? "variable" : "simple",
      variants: preparedVariants,
      images: images.map((img) => ({
        url: img.url,
        alt_text: form.name.trim() || undefined,
        is_primary: img.is_primary,
      })),
    });
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.status === "active" && variants.length === 0) {
      setTab("variants");
      return;
    }
    try {
      const product = await create.mutate();
      router.push(`/products/${product.id}`);
    } catch {
      /* toast */
    }
  }

  function addVariant() {
    if (!vSku.trim() || !vName.trim()) return;
    setVariants((list) => [
      ...list,
      {
        key: `v-${Date.now()}`,
        sku: vSku.trim(),
        name: vName.trim(),
        price: vPrice,
        stock: vStock,
        is_default: list.length === 0,
      },
    ]);
    setVSku("");
    setVName("");
    setVPrice("0");
    setVStock("0");
  }

  function addImage() {
    if (!newImageUrl.trim()) return;
    setImages((list) => [
      ...list,
      {
        key: `img-${Date.now()}`,
        url: newImageUrl.trim(),
        is_primary: list.length === 0,
      },
    ]);
    setNewImageUrl("");
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
        title="New product"
        description="Same fields as edit — details, variants, and images in one create flow."
      />

      <div className="flex gap-1 rounded-xl border border-[var(--fs-line)] bg-white p-1">
        {(
          [
            ["details", "Details"],
            ["variants", `Variants (${variants.length})`],
            ["images", `Images (${images.length})`],
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

      <form onSubmit={onSubmit} className="space-y-4">
        {tab === "details" && (
          <>
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
                    maxLength={500}
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
                      onChange={(e) =>
                        setForm((f) => ({ ...f, status: e.target.value as ProductStatus }))
                      }
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </Select>
                  </Field>
                  <Field label="Visibility">
                    <Select
                      value={form.visibility}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          visibility: e.target.value as ProductVisibility,
                        }))
                      }
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
                      placeholder="kg / dozen / box"
                    />
                  </Field>
                  <Field label="Badge">
                    <Input
                      value={form.badge_label}
                      onChange={(e) => setForm((f) => ({ ...f, badge_label: e.target.value }))}
                      placeholder="Season's best"
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
          </>
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
                      <th className="px-4 py-3">Price (₹)</th>
                      <th className="px-4 py-3">Stock</th>
                      <th className="px-4 py-3">Default</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--fs-line)]">
                    {variants.map((v) => (
                      <tr key={v.key}>
                        <td className="px-4 py-3">
                          <Input
                            className="!py-1.5 font-mono text-xs"
                            value={v.sku}
                            onChange={(e) =>
                              setVariants((list) =>
                                list.map((row) =>
                                  row.key === v.key ? { ...row, sku: e.target.value } : row,
                                ),
                              )
                            }
                            placeholder="Auto if empty"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            className="!py-1.5"
                            value={v.name}
                            onChange={(e) =>
                              setVariants((list) =>
                                list.map((row) =>
                                  row.key === v.key ? { ...row, name: e.target.value } : row,
                                ),
                              )
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            className="!py-1.5"
                            value={v.price}
                            onChange={(e) =>
                              setVariants((list) =>
                                list.map((row) =>
                                  row.key === v.key ? { ...row, price: e.target.value } : row,
                                ),
                              )
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            min={0}
                            className="!w-20 !py-1.5"
                            value={v.stock}
                            onChange={(e) =>
                              setVariants((list) =>
                                list.map((row) =>
                                  row.key === v.key ? { ...row, stock: e.target.value } : row,
                                ),
                              )
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="radio"
                            name="default-variant"
                            checked={v.is_default}
                            onChange={() =>
                              setVariants((list) =>
                                list.map((row) => ({ ...row, is_default: row.key === v.key })),
                              )
                            }
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {variants.length > 1 && (
                            <button
                              type="button"
                              className="text-xs text-rose-600 hover:underline"
                              onClick={() =>
                                setVariants((list) => {
                                  const next = list.filter((row) => row.key !== v.key);
                                  if (next.length && !next.some((row) => row.is_default)) {
                                    next[0].is_default = true;
                                  }
                                  return next;
                                })
                              }
                            >
                              Remove
                            </button>
                          )}
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
                  <Input value={vSku} onChange={(e) => setVSku(e.target.value)} />
                </Field>
                <Field label="Name">
                  <Input value={vName} onChange={(e) => setVName(e.target.value)} />
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
                type="button"
                className="mt-3"
                disabled={!vSku.trim() || !vName.trim()}
                onClick={addVariant}
              >
                Add variant
              </Btn>
            </Surface>
          </div>
        )}

        {tab === "images" && (
          <div className="space-y-4">
            {images.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-3">
                {images.map((img) => (
                  <Surface key={img.key} className="overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="aspect-[4/3] w-full object-cover" />
                    <div className="flex items-center justify-between gap-2 p-3 text-xs">
                      <label className="inline-flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="primary-image"
                          checked={img.is_primary}
                          onChange={() =>
                            setImages((list) =>
                              list.map((row) => ({
                                ...row,
                                is_primary: row.key === img.key,
                              })),
                            )
                          }
                        />
                        Primary
                      </label>
                      <button
                        type="button"
                        className="text-rose-600 hover:underline"
                        onClick={() => setImages((list) => list.filter((row) => row.key !== img.key))}
                      >
                        Remove
                      </button>
                    </div>
                  </Surface>
                ))}
              </div>
            )}
            <Surface padded>
              <SectionLabel>Add image URL</SectionLabel>
              <div className="flex flex-wrap gap-2">
                <div className="min-w-[200px] flex-1">
                  <Input
                    type="url"
                    placeholder="https://…"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                  />
                </div>
                <Btn type="button" disabled={!newImageUrl.trim()} onClick={addImage}>
                  Add
                </Btn>
              </div>
            </Surface>
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-[var(--fs-line)] pt-4">
          <Btn type="submit" disabled={create.isLoading || !form.name.trim()}>
            {create.isLoading ? "Creating…" : "Create product"}
          </Btn>
          <Link href="/products">
            <Btn type="button" variant="ghost">
              Cancel
            </Btn>
          </Link>
          {form.status === "active" && variants.length === 0 && (
            <p className="w-full text-sm text-rose-600">Active products need at least one variant.</p>
          )}
        </div>
      </form>
    </div>
  );
}

export default function NewProductPage() {
  return (
    <RequirePermission permission={P.CATALOG_MANAGE}>
      <NewProductPanel />
    </RequirePermission>
  );
}
