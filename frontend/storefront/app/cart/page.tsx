"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, useMutation, useQuery } from "@fruitshop/web-core";

import { StoreShell } from "@/src/components/StoreChrome";
import { cartApi, formatMoney } from "@/src/modules/orders/api";

function CartSkeleton() {
  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]" role="status" aria-label="Loading cart">
      <div className="overflow-hidden rounded-2xl border border-[var(--fs-line)] bg-white">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 border-b border-[var(--fs-line)] p-5 last:border-b-0"
          >
            <div className="fs-skeleton size-24 shrink-0 !rounded-xl" />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="fs-skeleton h-4 w-2/3" />
              <div className="fs-skeleton h-3 w-1/3" />
              <div className="fs-skeleton h-9 w-28 !rounded-xl" />
            </div>
            <div className="fs-skeleton h-4 w-16" />
          </div>
        ))}
      </div>
      <div className="h-fit rounded-2xl border border-[var(--fs-line)] bg-white p-5">
        <div className="fs-skeleton h-6 w-28" />
        <div className="mt-5 space-y-3">
          <div className="fs-skeleton h-4 w-full" />
          <div className="fs-skeleton h-4 w-full" />
          <div className="fs-skeleton h-4 w-full" />
          <div className="fs-skeleton h-5 w-full" />
        </div>
        <div className="fs-skeleton mt-6 h-12 w-full !rounded-full" />
      </div>
    </div>
  );
}

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated, bootstrapping } = useAuth();

  const cart = useQuery(() => cartApi.get(), [], {
    enabled: isAuthenticated,
  });

  const updateQty = useMutation((args: { itemId: string; quantity: number }) =>
    cartApi.updateItem(args.itemId, args.quantity),
  );
  const remove = useMutation((itemId: string) => cartApi.removeItem(itemId));

  if (bootstrapping) {
    return (
      <StoreShell>
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          <div className="fs-skeleton h-3 w-16" />
          <div className="fs-skeleton mt-2 h-9 w-40" />
          <CartSkeleton />
        </div>
      </StoreShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <StoreShell>
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <p className="fs-eyebrow">Cart</p>
          <h1 className="fs-section-title mt-2 text-3xl">Sign in to continue</h1>
          <p className="mt-3 text-sm font-medium text-[var(--fs-muted)]">
            Save fruit to your cart and checkout when you’re ready.
          </p>
          <Link href="/login?next=/cart" className="fs-btn-primary mt-8 inline-flex">
            Sign in
          </Link>
        </div>
      </StoreShell>
    );
  }

  const items = cart.data?.items ?? [];
  const empty = !cart.isLoading && items.length === 0;
  const stockBlocked = items.some((i) => !i.in_stock);

  return (
    <StoreShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="fs-eyebrow">Cart</p>
            <h1 className="fs-section-title mt-1 text-3xl sm:text-4xl">Your cart</h1>
            <p className="mt-2 text-sm font-medium text-[var(--fs-muted)]">
              Ripe picks, ready when you are.
            </p>
          </div>
          {!cart.isLoading && cart.data && items.length > 0 && (
            <p className="rounded-full bg-[var(--fs-mist)] px-3.5 py-1.5 text-sm font-extrabold text-[var(--fs-accent-deep)]">
              {cart.data.item_count} item{cart.data.item_count === 1 ? "" : "s"}
            </p>
          )}
        </div>

        {cart.isLoading && <CartSkeleton />}

        {cart.error && (
          <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
            {cart.error.message}
          </div>
        )}

        {empty && (
          <div className="mt-10 rounded-2xl border border-dashed border-[var(--fs-line)] bg-white px-6 py-16 text-center shadow-[var(--fs-shadow-sm)]">
            <p className="text-xl font-extrabold text-[var(--fs-ink)]">Cart is empty</p>
            <p className="mt-2 text-sm font-medium text-[var(--fs-muted)]">
              Browse the catalog and add something delicious.
            </p>
            <Link href="/shop" className="fs-btn-primary mt-6 inline-flex">
              Shop fruit
            </Link>
          </div>
        )}

        {!empty && cart.data && (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
            <ul className="divide-y divide-[var(--fs-line)] overflow-hidden rounded-2xl border border-[var(--fs-line)] bg-white shadow-[var(--fs-shadow-sm)]">
              {items.map((item) => (
                <li key={item.id} className="flex gap-4 p-4 sm:p-5">
                  <Link
                    href={item.product_slug ? `/product/${item.product_slug}` : "/shop"}
                    className="size-20 shrink-0 overflow-hidden rounded-xl bg-[var(--fs-mist)] sm:size-24"
                  >
                    {item.primary_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.primary_image_url}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="grid size-full place-items-center text-lg font-extrabold text-[var(--fs-accent)]/30">
                        {(item.product_name || "?").slice(0, 1)}
                      </div>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    {item.product_slug ? (
                      <Link
                        href={`/product/${item.product_slug}`}
                        className="font-extrabold text-[var(--fs-ink)] hover:text-[var(--fs-accent-deep)]"
                      >
                        {item.product_name}
                      </Link>
                    ) : (
                      <p className="font-extrabold text-[var(--fs-ink)]">{item.product_name}</p>
                    )}
                    <p className="mt-0.5 text-sm font-medium text-[var(--fs-muted)]">
                      {item.variant_name}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[var(--fs-muted)]">
                      {formatMoney(item.unit_price)} each
                    </p>
                    {!item.in_stock && (
                      <p className="mt-1.5 text-xs font-bold text-rose-600">
                        Not enough stock — adjust quantity
                      </p>
                    )}
                    {item.in_stock && item.stock_qty != null && item.stock_qty <= 5 && (
                      <p className="mt-1.5 text-xs font-bold text-[var(--fs-accent-deep)]">
                        Only {item.stock_qty} left
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <div className="inline-flex items-center overflow-hidden rounded-xl border border-[var(--fs-line)] bg-white">
                        <button
                          type="button"
                          className="px-3 py-1.5 text-lg font-bold text-[var(--fs-muted)] hover:bg-[var(--fs-mist)]"
                          disabled={updateQty.isLoading || item.quantity <= 1}
                          onClick={async () => {
                            if (item.quantity <= 1) return;
                            try {
                              await updateQty.mutate({
                                itemId: item.id,
                                quantity: item.quantity - 1,
                              });
                              await cart.refetch();
                            } catch {
                              /* toast */
                            }
                          }}
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="min-w-[2rem] text-center text-sm font-extrabold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          className="px-3 py-1.5 text-lg font-bold text-[var(--fs-muted)] hover:bg-[var(--fs-mist)] disabled:opacity-40"
                          disabled={
                            updateQty.isLoading ||
                            (item.stock_qty != null && item.quantity >= item.stock_qty)
                          }
                          onClick={async () => {
                            if (item.stock_qty != null && item.quantity >= item.stock_qty) {
                              return;
                            }
                            try {
                              await updateQty.mutate({
                                itemId: item.id,
                                quantity: item.quantity + 1,
                              });
                              await cart.refetch();
                            } catch {
                              /* toast */
                            }
                          }}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="text-xs font-bold text-rose-600 hover:underline"
                        disabled={remove.isLoading}
                        onClick={async () => {
                          try {
                            await remove.mutate(item.id);
                            await cart.refetch();
                          } catch {
                            /* toast */
                          }
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-extrabold text-[var(--fs-ink)]">
                    {formatMoney(item.line_subtotal)}
                  </p>
                </li>
              ))}
            </ul>

            <aside className="h-fit rounded-2xl border border-[var(--fs-line)] bg-white p-5 shadow-[var(--fs-shadow-sm)] lg:sticky lg:top-24">
              <h2 className="text-lg font-extrabold text-[var(--fs-ink)]">Order summary</h2>
              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="font-medium text-[var(--fs-muted)]">Subtotal</dt>
                  <dd className="font-semibold">{formatMoney(cart.data.subtotal)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="font-medium text-[var(--fs-muted)]">Tax</dt>
                  <dd className="font-semibold">{formatMoney(cart.data.tax_amount)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="font-medium text-[var(--fs-muted)]">Shipping</dt>
                  <dd className="font-semibold">
                    {Number(cart.data.shipping_amount) === 0
                      ? "Free"
                      : formatMoney(cart.data.shipping_amount)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 border-t border-[var(--fs-line)] pt-2.5 text-base font-extrabold">
                  <dt>Total</dt>
                  <dd>{formatMoney(cart.data.total)}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs font-medium text-[var(--fs-muted)]">
                Free shipping on orders ₹999+. Coupons apply at checkout.
              </p>
              {stockBlocked && (
                <p className="mt-3 text-xs font-bold text-rose-600">
                  Fix out-of-stock items before checkout.
                </p>
              )}
              <button
                type="button"
                className="fs-btn-primary mt-5 w-full disabled:opacity-50"
                disabled={stockBlocked || updateQty.isLoading || remove.isLoading}
                onClick={() => router.push("/checkout")}
              >
                Proceed to checkout
              </button>
              <Link
                href="/shop"
                className="mt-3 block text-center text-sm font-bold text-[var(--fs-accent)] hover:underline"
              >
                Continue shopping
              </Link>
            </aside>
          </div>
        )}
      </div>
    </StoreShell>
  );
}
