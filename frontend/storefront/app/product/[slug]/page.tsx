"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth, useMutation, useQuery } from "@fruitshop/web-core";

import {
  ProductGrid,
  ProductSkeletonGrid,
  SectionHeader,
} from "@/src/components/ProductCard";
import { StoreShell } from "@/src/components/StoreChrome";
import {
  catalogApi,
  formatMoney,
  variantAvailableQty,
  variantIsPurchasable,
} from "@/src/modules/catalog/api";
import { cartApi } from "@/src/modules/orders/api";

function ProductPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6" role="status" aria-label="Loading product">
      <div className="fs-skeleton h-4 w-48" />
      <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div>
          <div className="fs-skeleton aspect-square w-full !rounded-2xl" />
          <div className="mt-3 flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="fs-skeleton size-16 shrink-0 !rounded-xl" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="fs-skeleton h-6 w-20 !rounded-full" />
            <div className="fs-skeleton h-6 w-16 !rounded-full" />
          </div>
          <div className="fs-skeleton h-10 w-3/4" />
          <div className="fs-skeleton h-4 w-full" />
          <div className="fs-skeleton h-4 w-5/6" />
          <div className="fs-skeleton mt-6 h-9 w-32" />
          <div className="fs-skeleton h-12 w-40 !rounded-xl" />
          <div className="fs-skeleton h-12 w-full !rounded-full" />
          <div className="fs-skeleton h-12 w-36 !rounded-full" />
        </div>
      </div>
    </div>
  );
}

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
  const defaultVariant = variants.find((v) => v.is_default) ?? variants[0] ?? null;
  const [variantId, setVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [addedFlash, setAddedFlash] = useState(false);

  useEffect(() => {
    setVariantId(null);
    setQuantity(1);
    setImageIndex(0);
    setAddedFlash(false);
  }, [slug]);

  const selected =
    variants.find((v) => v.id === (variantId ?? defaultVariant?.id)) ?? defaultVariant;

  const trackInventory = detail.data?.track_inventory !== false;
  const canBuy = selected ? variantIsPurchasable(selected, { trackInventory }) : false;
  const available = selected ? variantAvailableQty(selected) : 0;
  const maxQty = (() => {
    if (!detail.data || !selected) return 1;
    const caps = [detail.data.max_order_qty].filter(
      (n): n is number => typeof n === "number" && n > 0,
    );
    if (trackInventory && selected.inventory_policy !== "continue") {
      caps.push(Math.max(available, detail.data.min_order_qty || 1));
    }
    return caps.length ? Math.min(...caps) : undefined;
  })();

  const addToCart = useMutation(() => cartApi.addItem(selected!.id, quantity));

  const images = detail.data?.images?.length
    ? [...detail.data.images].sort((a, b) => a.sort_order - b.sort_order)
    : [];
  const activeImage = images[imageIndex] ?? images[0] ?? null;

  if (detail.isLoading) {
    return (
      <StoreShell>
        <ProductPageSkeleton />
      </StoreShell>
    );
  }

  if (detail.error || !detail.data) {
    return (
      <StoreShell>
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
          <p className="fs-eyebrow">Shop</p>
          <h1 className="fs-section-title mt-2 text-3xl">Fruit not found</h1>
          <p className="mt-3 text-sm font-medium text-[var(--fs-muted)]">
            This listing may be unavailable or removed.
          </p>
          <Link href="/shop" className="fs-btn-primary mt-8 inline-flex">
            Back to shop
          </Link>
        </div>
      </StoreShell>
    );
  }

  const p = detail.data;
  const relatedItems = (related.data?.items ?? []).filter((i) => i.id !== p.id).slice(0, 4);
  const minQty = p.min_order_qty || 1;

  return (
    <StoreShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--fs-muted)]">
          <Link href="/shop" className="hover:text-[var(--fs-accent)]">
            Shop
          </Link>
          {p.category && (
            <>
              <span className="text-[var(--fs-line)]">/</span>
              <Link
                href={`/shop?category=${p.category.id}`}
                className="hover:text-[var(--fs-accent)]"
              >
                {p.category.name}
              </Link>
            </>
          )}
          <span className="text-[var(--fs-line)]">/</span>
          <span className="truncate text-[var(--fs-ink)]">{p.name}</span>
        </nav>

        <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Gallery */}
          <div>
            <div className="overflow-hidden rounded-2xl border border-[var(--fs-line)] bg-[var(--fs-mist)] shadow-[var(--fs-shadow-sm)]">
              {activeImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeImage.url}
                  alt={activeImage.alt_text ?? p.name}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="grid aspect-square place-items-center text-6xl font-extrabold text-[var(--fs-accent)]/25">
                  {p.name.slice(0, 1)}
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setImageIndex(i)}
                    className={`size-16 shrink-0 overflow-hidden rounded-xl transition ${
                      i === imageIndex
                        ? "ring-2 ring-[var(--fs-accent)] ring-offset-2"
                        : "ring-1 ring-[var(--fs-line)] opacity-80 hover:opacity-100"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Buy panel */}
          <div>
            <div className="flex flex-wrap gap-2">
              {p.is_organic && (
                <span className="rounded-full bg-[var(--fs-mist)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[var(--fs-accent-deep)]">
                  Organic
                </span>
              )}
              {p.badge_label && (
                <span className="rounded-full bg-[var(--fs-accent)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white">
                  {p.badge_label}
                </span>
              )}
              {p.brand?.name && (
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[var(--fs-muted)] ring-1 ring-[var(--fs-line)]">
                  {p.brand.name}
                </span>
              )}
            </div>

            <h1 className="fs-section-title mt-3 text-3xl sm:text-4xl">{p.name}</h1>
            {p.short_description && (
              <p className="mt-3 text-sm font-medium leading-relaxed text-[var(--fs-muted)]">
                {p.short_description}
              </p>
            )}

            <div className="mt-6">
              <p className="text-3xl font-extrabold tracking-tight text-[var(--fs-ink)]">
                {formatMoney(selected?.price) ?? "See options"}
                {p.unit_label ? (
                  <span className="ml-1.5 text-base font-bold text-[var(--fs-muted)]">
                    / {p.unit_label}
                  </span>
                ) : null}
              </p>
              {selected?.compare_at_price != null && (
                <p className="mt-1 text-sm font-semibold text-[var(--fs-muted)] line-through">
                  {formatMoney(selected.compare_at_price)}
                </p>
              )}
            </div>

            {variants.length > 1 && (
              <div className="mt-7">
                <p className="text-sm font-extrabold text-[var(--fs-ink)]">Choose option</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {variants.map((v) => {
                    const purchasable = variantIsPurchasable(v, { trackInventory });
                    const active = selected?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setVariantId(v.id);
                          setQuantity(minQty);
                        }}
                        className={`rounded-xl border px-3.5 py-2.5 text-sm font-bold transition ${
                          active
                            ? "border-[var(--fs-accent)] bg-[var(--fs-mist)] text-[var(--fs-accent-deep)]"
                            : "border-[var(--fs-line)] bg-white text-[var(--fs-muted)] hover:border-[var(--fs-accent)]/40"
                        } ${!purchasable ? "opacity-60" : ""}`}
                      >
                        {v.name}
                        {!purchasable ? " · Sold out" : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {selected && canBuy && (
              <div className="mt-6">
                <p className="text-sm font-extrabold text-[var(--fs-ink)]">Quantity</p>
                <div className="mt-2.5 inline-flex items-center overflow-hidden rounded-xl border border-[var(--fs-line)] bg-white shadow-[var(--fs-shadow-sm)]">
                  <button
                    type="button"
                    className="px-4 py-2.5 text-lg font-bold text-[var(--fs-muted)] hover:bg-[var(--fs-mist)]"
                    onClick={() => setQuantity((q) => Math.max(minQty, q - 1))}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="min-w-[2.75rem] text-center text-sm font-extrabold">{quantity}</span>
                  <button
                    type="button"
                    className="px-4 py-2.5 text-lg font-bold text-[var(--fs-muted)] hover:bg-[var(--fs-mist)]"
                    onClick={() =>
                      setQuantity((q) => {
                        const next = q + 1;
                        if (maxQty != null) return Math.min(maxQty, next);
                        return next;
                      })
                    }
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            <p
              className={`mt-4 text-sm font-semibold ${
                canBuy ? "text-[var(--fs-accent-deep)]" : "text-rose-600"
              }`}
            >
              {canBuy
                ? trackInventory && selected && selected.inventory_policy !== "continue"
                  ? `${available} available — ready to order`
                  : "In stock — ready to order"
                : "Currently out of stock"}
            </p>

            {addedFlash && (
              <p className="mt-3 text-sm font-bold text-[var(--fs-accent-deep)]">
                Added to cart.
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              {canBuy ? (
                isAuthenticated ? (
                  <>
                    <button
                      type="button"
                      disabled={addToCart.isLoading}
                      className="fs-btn-primary disabled:opacity-60"
                      onClick={async () => {
                        try {
                          await addToCart.mutate();
                          setAddedFlash(true);
                          window.setTimeout(() => setAddedFlash(false), 2500);
                        } catch {
                          /* toast */
                        }
                      }}
                    >
                      {addToCart.isLoading ? "Adding…" : "Add to cart"}
                    </button>
                    <button
                      type="button"
                      disabled={addToCart.isLoading}
                      className="rounded-full border border-[var(--fs-line)] bg-white px-6 py-3 text-sm font-bold text-[var(--fs-ink)] hover:bg-[var(--fs-mist)] disabled:opacity-60"
                      onClick={async () => {
                        try {
                          await addToCart.mutate();
                          router.push("/cart");
                        } catch {
                          /* toast */
                        }
                      }}
                    >
                      Buy now
                    </button>
                  </>
                ) : (
                  <Link
                    href={`/login?next=/product/${slug}`}
                    className="fs-btn-primary"
                  >
                    Sign in to order
                  </Link>
                )
              ) : (
                <Link
                  href="/shop"
                  className="rounded-full border border-[var(--fs-line)] bg-white px-6 py-3 text-sm font-bold text-[var(--fs-ink)] hover:bg-[var(--fs-mist)]"
                >
                  Browse other fruit
                </Link>
              )}
              <Link
                href="/shop"
                className="rounded-full px-5 py-3 text-sm font-bold text-[var(--fs-muted)] hover:bg-[var(--fs-mist)] hover:text-[var(--fs-ink)]"
              >
                Keep shopping
              </Link>
            </div>

            {p.tags.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {p.tags.map((t) => (
                  <Link
                    key={t.id}
                    href={`/shop?tag=${t.slug}`}
                    className="rounded-full bg-[var(--fs-mist)] px-3 py-1.5 text-xs font-extrabold text-[var(--fs-accent-deep)] hover:bg-[var(--fs-accent)] hover:text-white"
                  >
                    {t.name}
                  </Link>
                ))}
              </div>
            )}

            {(p.storage_instructions || p.origin_region || p.shelf_life_days != null) && (
              <dl className="mt-8 space-y-3 rounded-2xl border border-[var(--fs-line)] bg-white p-5 shadow-[var(--fs-shadow-sm)]">
                {p.origin_region && (
                  <div className="flex gap-3 text-sm">
                    <dt className="w-24 shrink-0 font-bold text-[var(--fs-muted)]">Origin</dt>
                    <dd className="font-semibold text-[var(--fs-ink)]">{p.origin_region}</dd>
                  </div>
                )}
                {p.shelf_life_days != null && (
                  <div className="flex gap-3 text-sm">
                    <dt className="w-24 shrink-0 font-bold text-[var(--fs-muted)]">Shelf life</dt>
                    <dd className="font-semibold text-[var(--fs-ink)]">{p.shelf_life_days} days</dd>
                  </div>
                )}
                {p.storage_instructions && (
                  <div className="flex gap-3 text-sm">
                    <dt className="w-24 shrink-0 font-bold text-[var(--fs-muted)]">Storage</dt>
                    <dd className="font-semibold text-[var(--fs-ink)]">{p.storage_instructions}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        </div>

        {p.description && (
          <section className="mt-14 max-w-3xl">
            <h2 className="fs-section-title text-2xl">About this fruit</h2>
            <p className="mt-4 whitespace-pre-wrap text-sm font-medium leading-relaxed text-[var(--fs-muted)]">
              {p.description}
            </p>
          </section>
        )}

        {p.attributes.filter((a) => a.is_visible).length > 0 && (
          <section className="mt-12 max-w-3xl">
            <h2 className="fs-section-title text-2xl">Details</h2>
            <dl className="mt-5 overflow-hidden rounded-2xl border border-[var(--fs-line)] bg-white shadow-[var(--fs-shadow-sm)]">
              {p.attributes
                .filter((a) => a.is_visible)
                .map((a) => (
                  <div
                    key={a.id}
                    className="flex justify-between gap-4 border-b border-[var(--fs-line)] px-5 py-3.5 text-sm last:border-b-0"
                  >
                    <dt className="font-bold text-[var(--fs-muted)]">{a.name}</dt>
                    <dd className="font-extrabold text-[var(--fs-ink)]">{a.value}</dd>
                  </div>
                ))}
            </dl>
          </section>
        )}

        {(p.relations ?? []).filter((r) => r.related_slug).length > 0 && (
          <section className="mt-12 max-w-3xl">
            <h2 className="fs-section-title text-2xl">You may also like</h2>
            <ul className="mt-5 divide-y divide-[var(--fs-line)] overflow-hidden rounded-2xl border border-[var(--fs-line)] bg-white shadow-[var(--fs-shadow-sm)]">
              {(p.relations ?? [])
                .filter((r) => r.related_slug)
                .map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/product/${r.related_slug}`}
                      className="flex items-center justify-between gap-3 px-5 py-4 transition hover:bg-[var(--fs-mist)]/50"
                    >
                      <span className="font-extrabold text-[var(--fs-ink)]">
                        {r.related_name ?? r.related_slug}
                      </span>
                      <span className="text-xs font-bold capitalize text-[var(--fs-muted)]">
                        {String(r.relation_type).replaceAll("_", " ")}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        )}

        {(related.isLoading || relatedItems.length > 0) && (
          <section className="mt-16">
            <SectionHeader
              eyebrow="More to explore"
              title={p.category?.name ? `More in ${p.category.name}` : "Related fruit"}
              action={
                p.category ? (
                  <Link
                    href={`/shop?category=${p.category.id}`}
                    className="text-sm font-bold text-[var(--fs-accent)] hover:underline"
                  >
                    View all →
                  </Link>
                ) : null
              }
            />
            {related.isLoading ? (
              <ProductSkeletonGrid count={4} />
            ) : (
              <ProductGrid products={relatedItems} />
            )}
          </section>
        )}
      </div>
    </StoreShell>
  );
}
