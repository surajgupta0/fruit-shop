"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth, useMutation, useQuery } from "@fruitshop/web-core";

import { ProductGrid } from "@/src/components/ProductCard";
import { StoreShell } from "@/src/components/StoreChrome";
import { catalogApi, formatMoney } from "@/src/modules/catalog/api";
import { cartApi } from "@/src/modules/orders/api";

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const slug = params.slug;

  const detail = useQuery(() => catalogApi.getBySlug(slug), [slug]);
  const related = useQuery(
    () =>
      catalogApi.listProducts({
        category_id: detail.data?.category?.id,
        page_size: 4,
      }),
    [detail.data?.category?.id],
    { enabled: Boolean(detail.data?.category?.id) },
  );

  const variants = useMemo(
    () => (detail.data?.variants ?? []).filter((v) => v.is_active),
    [detail.data],
  );
  const defaultVariant =
    variants.find((v) => v.is_default) ?? variants[0] ?? null;
  const [variantId, setVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const selected =
    variants.find((v) => v.id === (variantId ?? defaultVariant?.id)) ?? defaultVariant;

  const addToCart = useMutation(() =>
    cartApi.addItem(selected!.id, quantity),
  );

  const images = detail.data?.images?.length
    ? [...detail.data.images].sort((a, b) => a.sort_order - b.sort_order)
    : [];
  const primary = images.find((i) => i.is_primary) ?? images[0];

  if (detail.isLoading) {
    return (
      <StoreShell>
        <p className="p-8 text-sm text-[var(--fs-muted)]">Loading product…</p>
      </StoreShell>
    );
  }

  if (detail.error || !detail.data) {
    return (
      <StoreShell>
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl">Fruit not found</h1>
          <p className="mt-2 text-sm text-[var(--fs-muted)]">
            This listing may be unavailable.
          </p>
          <Link href="/shop" className="mt-6 inline-block text-[var(--fs-leaf)] hover:underline">
            Back to shop
          </Link>
        </div>
      </StoreShell>
    );
  }

  const p = detail.data;
  const relatedItems = (related.data?.items ?? []).filter((i) => i.id !== p.id).slice(0, 3);

  return (
    <StoreShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="flex flex-wrap items-center gap-2 text-sm text-[var(--fs-muted)]">
          <Link href="/shop" className="hover:text-[var(--fs-leaf)]">
            Shop
          </Link>
          {p.category && (
            <>
              <span>/</span>
              <Link
                href={`/category/${p.category.slug}`}
                className="hover:text-[var(--fs-leaf)]"
              >
                {p.category.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-[var(--fs-ink)]">{p.name}</span>
        </nav>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-[var(--fs-line)] bg-[var(--fs-mist)]">
            {primary ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={primary.url}
                alt={primary.alt_text ?? p.name}
                className="aspect-square w-full object-cover"
              />
            ) : (
              <div className="grid aspect-square place-items-center font-[family-name:var(--font-fraunces)] text-6xl text-[var(--fs-leaf)]/30">
                F
              </div>
            )}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto border-t border-[var(--fs-line)] bg-white p-3">
                {images.map((img) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={img.id}
                    src={img.url}
                    alt=""
                    className="size-16 shrink-0 rounded-lg object-cover ring-1 ring-[var(--fs-line)]"
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex flex-wrap gap-2">
              {p.is_organic && (
                <span className="rounded-md bg-[var(--fs-mist)] px-2 py-0.5 text-[11px] font-semibold uppercase text-[var(--fs-leaf-deep)]">
                  Organic
                </span>
              )}
              {p.badge_label && (
                <span className="rounded-md bg-[var(--fs-mango)]/20 px-2 py-0.5 text-[11px] font-semibold uppercase text-[var(--fs-mango-deep)]">
                  {p.badge_label}
                </span>
              )}
            </div>

            <h1 className="mt-3 font-[family-name:var(--font-fraunces)] text-3xl tracking-tight sm:text-4xl">
              {p.name}
            </h1>
            {p.short_description && (
              <p className="mt-3 text-[var(--fs-muted)]">{p.short_description}</p>
            )}

            <p className="mt-5 font-[family-name:var(--font-fraunces)] text-2xl text-[var(--fs-ink)]">
              {formatMoney(selected?.price) ?? "See options"}
              {p.unit_label ? (
                <span className="ml-1 text-base font-sans text-[var(--fs-muted)]">
                  / {p.unit_label}
                </span>
              ) : null}
            </p>
            {selected && selected.compare_at_price != null && (
              <p className="text-sm text-[var(--fs-muted)] line-through">
                {formatMoney(selected.compare_at_price)}
              </p>
            )}

            {variants.length > 1 && (
              <div className="mt-6">
                <p className="text-sm font-medium text-stone-700">Choose option</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVariantId(v.id)}
                      className={`rounded-xl border px-3 py-2 text-sm transition ${
                        selected?.id === v.id
                          ? "border-[var(--fs-leaf)] bg-[var(--fs-mist)] text-[var(--fs-leaf-deep)]"
                          : "border-[var(--fs-line)] bg-white text-[var(--fs-muted)] hover:border-[var(--fs-leaf)]/40"
                      }`}
                    >
                      {v.name}
                      {v.stock_qty <= 0 ? " · Sold out" : ""}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selected && selected.stock_qty > 0 && (
              <div className="mt-5">
                <p className="text-sm font-medium text-stone-700">Quantity</p>
                <div className="mt-2 inline-flex items-center rounded-xl border border-[var(--fs-line)]">
                  <button
                    type="button"
                    className="px-3 py-2 text-lg text-[var(--fs-muted)]"
                    onClick={() => setQuantity((q) => Math.max(p.min_order_qty || 1, q - 1))}
                  >
                    −
                  </button>
                  <span className="min-w-[2.5rem] text-center text-sm font-medium">{quantity}</span>
                  <button
                    type="button"
                    className="px-3 py-2 text-lg text-[var(--fs-muted)]"
                    onClick={() =>
                      setQuantity((q) =>
                        p.max_order_qty ? Math.min(p.max_order_qty, q + 1) : q + 1,
                      )
                    }
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            <p className="mt-4 text-sm text-[var(--fs-muted)]">
              {selected && selected.stock_qty > 0
                ? "In stock — ready to order"
                : "Currently out of stock"}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {selected && selected.stock_qty > 0 ? (
                isAuthenticated ? (
                  <>
                    <button
                      type="button"
                      disabled={addToCart.isLoading}
                      className="rounded-full bg-[var(--fs-leaf-deep)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--fs-leaf)] disabled:opacity-60"
                      onClick={async () => {
                        try {
                          await addToCart.mutate();
                          router.push("/cart");
                        } catch {
                          /* toast */
                        }
                      }}
                    >
                      {addToCart.isLoading ? "Adding…" : "Add to cart"}
                    </button>
                    <Link
                      href="/cart"
                      className="rounded-full border border-[var(--fs-line)] bg-white px-6 py-3 text-sm font-medium text-[var(--fs-ink)] hover:bg-[var(--fs-mist)]"
                    >
                      View cart
                    </Link>
                  </>
                ) : (
                  <Link
                    href={`/login?next=/product/${slug}`}
                    className="rounded-full bg-[var(--fs-leaf-deep)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--fs-leaf)]"
                  >
                    Sign in to order
                  </Link>
                )
              ) : (
                <Link
                  href="/shop"
                  className="rounded-full border border-[var(--fs-line)] bg-white px-6 py-3 text-sm font-medium text-[var(--fs-ink)] hover:bg-[var(--fs-mist)]"
                >
                  Browse other fruit
                </Link>
              )}
              <Link
                href="/shop"
                className="rounded-full border border-[var(--fs-line)] bg-white px-6 py-3 text-sm font-medium text-[var(--fs-ink)] hover:bg-[var(--fs-mist)]"
              >
                Keep shopping
              </Link>
            </div>

            {p.tags.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {p.tags.map((t) => (
                  <Link
                    key={t.id}
                    href={`/tag/${t.slug}`}
                    className="rounded-full bg-[var(--fs-mist)] px-3 py-1 text-xs font-medium text-[var(--fs-leaf-deep)] hover:bg-[var(--fs-leaf)] hover:text-white"
                  >
                    {t.name}
                  </Link>
                ))}
              </div>
            )}

            {(p.storage_instructions || p.origin_region || p.shelf_life_days != null) && (
              <dl className="mt-8 space-y-2 border-t border-[var(--fs-line)] pt-6 text-sm">
                {p.origin_region && (
                  <div className="flex gap-2">
                    <dt className="w-28 text-[var(--fs-muted)]">Origin</dt>
                    <dd>{p.origin_region}</dd>
                  </div>
                )}
                {p.shelf_life_days != null && (
                  <div className="flex gap-2">
                    <dt className="w-28 text-[var(--fs-muted)]">Shelf life</dt>
                    <dd>{p.shelf_life_days} days</dd>
                  </div>
                )}
                {p.storage_instructions && (
                  <div className="flex gap-2">
                    <dt className="w-28 text-[var(--fs-muted)]">Storage</dt>
                    <dd>{p.storage_instructions}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        </div>

        {p.description && (
          <section className="mt-12 max-w-3xl">
            <h2 className="font-[family-name:var(--font-fraunces)] text-2xl">About this fruit</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--fs-muted)]">
              {p.description}
            </p>
          </section>
        )}

        {p.attributes.filter((a) => a.is_visible).length > 0 && (
          <section className="mt-10 max-w-3xl">
            <h2 className="font-[family-name:var(--font-fraunces)] text-2xl">Details</h2>
            <dl className="mt-4 divide-y divide-[var(--fs-line)] rounded-2xl border border-[var(--fs-line)] bg-white">
              {p.attributes
                .filter((a) => a.is_visible)
                .map((a) => (
                  <div key={a.id} className="flex justify-between gap-4 px-4 py-3 text-sm">
                    <dt className="text-[var(--fs-muted)]">{a.name}</dt>
                    <dd className="font-medium text-[var(--fs-ink)]">{a.value}</dd>
                  </div>
                ))}
            </dl>
          </section>
        )}

        {relatedItems.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-6 font-[family-name:var(--font-fraunces)] text-2xl">
              More in {p.category?.name}
            </h2>
            <ProductGrid products={relatedItems} />
          </section>
        )}
      </div>
    </StoreShell>
  );
}
