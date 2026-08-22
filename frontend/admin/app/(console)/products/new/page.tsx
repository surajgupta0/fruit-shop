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
import { catalogApi, type ProductStatus } from "@/src/modules/catalog/api";

function NewProductPanel() {
  const router = useRouter();
  const categories = useQuery(() => catalogApi.listCategories(), []);
  const brands = useQuery(() => catalogApi.listBrands(), []);

  const [name, setName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [status, setStatus] = useState<ProductStatus>("draft");
  const [unitLabel, setUnitLabel] = useState("kg");
  const [isOrganic, setIsOrganic] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("0");
  const [stock, setStock] = useState("0");
  const [imageUrl, setImageUrl] = useState("");

  const create = useMutation(() =>
    catalogApi.createProduct({
      name: name.trim(),
      short_description: shortDescription.trim() || undefined,
      description: description.trim() || undefined,
      category_id: categoryId || null,
      brand_id: brandId || null,
      status,
      unit_label: unitLabel.trim() || undefined,
      is_organic: isOrganic,
      is_featured: isFeatured,
      product_type: "simple",
      variants: [
        {
          sku: sku.trim() || `SKU-${Date.now().toString(36).toUpperCase()}`,
          name: name.trim() || "Default",
          price: Number(price) || 0,
          stock_qty: Number(stock) || 0,
          is_default: true,
          is_active: true,
        },
      ],
      images: imageUrl.trim()
        ? [{ url: imageUrl.trim(), alt_text: name.trim(), is_primary: true }]
        : [],
    }),
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const product = await create.mutate();
      router.push(`/products/${product.id}`);
    } catch {
      /* toast */
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        breadcrumb={
          <Link href="/products" className="mb-2 inline-block text-sm text-[var(--fs-muted)] hover:text-[var(--fs-leaf)]">
            ← Products
          </Link>
        }
        title="New product"
        description="Start as draft, add a default SKU, then publish when ready."
      />

      <form onSubmit={onSubmit} className="space-y-5">
        <Surface padded>
          <SectionLabel>Basics</SectionLabel>
          <div className="space-y-3.5">
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="Short description">
              <Input
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                maxLength={500}
              />
            </Field>
            <Field label="Full description">
              <textarea
                className="w-full rounded-xl border border-[var(--fs-line)] px-3 py-2.5 text-sm outline-none focus:border-[var(--fs-leaf)] focus:ring-2 focus:ring-[var(--fs-leaf)]/15"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Category">
                <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">None</option>
                  {(categories.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Brand">
                <Select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                  <option value="">None</option>
                  {(brands.data ?? []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Status">
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProductStatus)}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </Select>
              </Field>
              <Field label="Unit label">
                <Input
                  value={unitLabel}
                  onChange={(e) => setUnitLabel(e.target.value)}
                  placeholder="kg / dozen / box"
                />
              </Field>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isOrganic}
                  onChange={(e) => setIsOrganic(e.target.checked)}
                />
                Organic
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                />
                Featured
              </label>
            </div>
          </div>
        </Surface>

        <Surface padded>
          <SectionLabel>Default variant (SKU)</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="SKU">
              <Input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Auto if empty"
              />
            </Field>
            <Field label="Price (₹)">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </Field>
            <Field label="Stock qty">
              <Input
                type="number"
                min={0}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </Field>
          </div>
        </Surface>

        <Surface padded>
          <SectionLabel>Primary image</SectionLabel>
          <Field label="Image URL" hint="Paste a CDN or hosted image URL">
            <Input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
            />
          </Field>
        </Surface>

        <div className="flex gap-2">
          <Btn type="submit" disabled={create.isLoading}>
            {create.isLoading ? "Creating…" : "Create product"}
          </Btn>
          <Link href="/products">
            <Btn type="button" variant="ghost">
              Cancel
            </Btn>
          </Link>
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
