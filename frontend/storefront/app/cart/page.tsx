"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, useMutation, useQuery } from "@fruitshop/web-core";

import { StoreShell } from "@/src/components/StoreChrome";
import { cartApi, formatMoney } from "@/src/modules/orders/api";

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
        <p className="p-8 text-sm text-[var(--fs-muted)]">Loading cart…</p>
      </StoreShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <StoreShell>
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl">Your cart</h1>
          <p className="mt-2 text-sm text-[var(--fs-muted)]">Sign in to save fruit for checkout.</p>
          <Link
            href="/login?next=/cart"
            className="mt-6 inline-block rounded-full bg-[var(--fs-leaf-deep)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--fs-leaf)]"
          >
            Sign in
          </Link>
        </div>
      </StoreShell>
    );
  }

  const items = cart.data?.items ?? [];
  const empty = !cart.isLoading && items.length === 0;

  return (
    <StoreShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="font-[family-name:var(--font-fraunces)] text-3xl tracking-tight sm:text-4xl">
          Your cart
        </h1>
        <p className="mt-2 text-sm text-[var(--fs-muted)]">
          Ripe picks, ready when you are.
        </p>

        {cart.isLoading && (
          <p className="mt-10 text-sm text-[var(--fs-muted)]">Loading cart…</p>
        )}
        {cart.error && (
          <p className="mt-10 text-sm text-rose-600">{cart.error.message}</p>
        )}

        {empty && (
          <div className="mt-12 rounded-2xl border border-dashed border-[var(--fs-line)] bg-white px-6 py-16 text-center">
            <p className="font-[family-name:var(--font-fraunces)] text-xl text-[var(--fs-ink)]">
              Cart is empty
            </p>
            <p className="mt-2 text-sm text-[var(--fs-muted)]">
              Browse the catalog and add something delicious.
            </p>
            <Link
              href="/shop"
              className="mt-6 inline-block rounded-full bg-[var(--fs-mango)] px-6 py-3 text-sm font-semibold text-[var(--fs-orchard)] hover:bg-[var(--fs-citrus)]"
            >
              Shop fruit
            </Link>
          </div>
        )}

        {!empty && cart.data && (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
            <ul className="divide-y divide-[var(--fs-line)] rounded-2xl border border-[var(--fs-line)] bg-white">
              {items.map((item) => (
                <li key={item.id} className="flex gap-4 p-4 sm:p-5">
                  <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-[var(--fs-mist)] sm:size-24">
                    {item.primary_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.primary_image_url}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    {item.product_slug ? (
                      <Link
                        href={`/product/${item.product_slug}`}
                        className="font-medium text-[var(--fs-ink)] hover:text-[var(--fs-leaf)]"
                      >
                        {item.product_name}
                      </Link>
                    ) : (
                      <p className="font-medium">{item.product_name}</p>
                    )}
                    <p className="text-sm text-[var(--fs-muted)]">{item.variant_name}</p>
                    {!item.in_stock && (
                      <p className="mt-1 text-xs font-medium text-rose-600">
                        Not enough stock — adjust quantity
                      </p>
                    )}
                    {item.in_stock && item.stock_qty != null && item.stock_qty <= 5 && (
                      <p className="mt-1 text-xs text-[var(--fs-leaf-deep)]">
                        Only {item.stock_qty} left
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <div className="flex items-center rounded-xl border border-[var(--fs-line)]">
                        <button
                          type="button"
                          className="px-3 py-1.5 text-lg text-[var(--fs-muted)] hover:text-[var(--fs-ink)]"
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
                        >
                          −
                        </button>
                        <span className="min-w-[2rem] text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          className="px-3 py-1.5 text-lg text-[var(--fs-muted)] hover:text-[var(--fs-ink)] disabled:opacity-40"
                          disabled={
                            item.stock_qty != null && item.quantity >= item.stock_qty
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
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="text-xs font-medium text-rose-600 hover:underline"
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
                  <p className="shrink-0 text-sm font-semibold">
                    {formatMoney(item.line_subtotal)}
                  </p>
                </li>
              ))}
            </ul>

            <aside className="h-fit rounded-2xl border border-[var(--fs-line)] bg-white p-5 shadow-sm">
              <h2 className="font-[family-name:var(--font-fraunces)] text-xl">Summary</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--fs-muted)]">Subtotal</dt>
                  <dd>{formatMoney(cart.data.subtotal)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--fs-muted)]">Tax</dt>
                  <dd>{formatMoney(cart.data.tax_amount)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--fs-muted)]">Shipping</dt>
                  <dd>
                    {Number(cart.data.shipping_amount) === 0
                      ? "Free"
                      : formatMoney(cart.data.shipping_amount)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 border-t border-[var(--fs-line)] pt-2 font-semibold">
                  <dt>Total</dt>
                  <dd>{formatMoney(cart.data.total)}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-[var(--fs-muted)]">
                Free shipping on orders ₹999+. Available coupons show at checkout.
              </p>
              <button
                type="button"
                className="mt-5 w-full rounded-full bg-[var(--fs-leaf-deep)] py-3 text-sm font-semibold text-white hover:bg-[var(--fs-leaf)] disabled:opacity-50"
                disabled={items.some((i) => !i.in_stock)}
                onClick={() => router.push("/checkout")}
              >
                Proceed to checkout
              </button>
              <Link
                href="/shop"
                className="mt-3 block text-center text-sm font-medium text-[var(--fs-leaf)] hover:underline"
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
