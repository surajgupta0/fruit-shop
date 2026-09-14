"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useAuth, useMutation, useQuery } from "@fruitshop/web-core";

import { StoreShell } from "@/src/components/StoreChrome";
import {
  addressApi,
  cartApi,
  formatMoney,
  ordersApi,
  type PaymentMethod,
} from "@/src/modules/orders/api";
import {
  couponOfferLabel,
  couponsApi,
  type CouponValidateResponse,
} from "@/src/modules/coupons/api";

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, bootstrapping } = useAuth();

  const cart = useQuery(() => cartApi.get(), [], { enabled: isAuthenticated });
  const addresses = useQuery(() => addressApi.list(), [], { enabled: isAuthenticated });
  const availableCoupons = useQuery(
    () => couponsApi.listAvailable(),
    [cart.data?.subtotal, cart.data?.item_count],
    { enabled: isAuthenticated && Boolean(cart.data?.items?.length) },
  );

  const [addressId, setAddressId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [notes, setNotes] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidateResponse | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const checkoutKeyRef = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `chk-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const [newAddress, setNewAddress] = useState({
    label: "home",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal_code: "",
    is_default: true,
  });

  useEffect(() => {
    if (!addresses.data?.length) return;
    const def = addresses.data.find((a) => a.is_default) ?? addresses.data[0];
    setAddressId((current) => current || def.id);
  }, [addresses.data]);

  const addAddress = useMutation(() =>
    addressApi.create({
      label: newAddress.label,
      line1: newAddress.line1.trim(),
      line2: newAddress.line2.trim() || undefined,
      city: newAddress.city.trim(),
      state: newAddress.state.trim(),
      postal_code: newAddress.postal_code.trim(),
      country: "IN",
      is_default: newAddress.is_default,
    }),
  );

  const applyCoupon = useMutation(async (code: string) => {
    const result = await couponsApi.validate(code);
    if (!result.valid) {
      setAppliedCoupon(null);
      setCouponError(result.message || "Coupon is not valid");
      return result;
    }
    setAppliedCoupon(result);
    setCouponError(null);
    setCouponInput(result.code);
    return result;
  });

  const checkout = useMutation(() =>
    ordersApi.checkout({
      address_id: addressId,
      payment_method: paymentMethod,
      coupon_code: appliedCoupon?.valid ? appliedCoupon.code : undefined,
      notes: notes.trim() || undefined,
      idempotency_key: checkoutKeyRef.current,
    }),
  );

  if (bootstrapping) {
    return (
      <StoreShell>
        <p className="p-8 text-sm text-[var(--fs-muted)]">Loading…</p>
      </StoreShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <StoreShell>
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl">Checkout</h1>
          <p className="mt-2 text-sm text-[var(--fs-muted)]">Sign in to complete your order.</p>
          <Link
            href="/login?next=/checkout"
            className="mt-6 inline-block rounded-full bg-[var(--fs-leaf-deep)] px-6 py-3 text-sm font-semibold text-white"
          >
            Sign in
          </Link>
        </div>
      </StoreShell>
    );
  }

  const empty = cart.data && cart.data.items.length === 0;

  async function onAddAddress(e?: FormEvent) {
    e?.preventDefault();
    if (!newAddress.line1.trim() || !newAddress.city.trim() || !newAddress.state.trim() || !newAddress.postal_code.trim()) {
      return;
    }
    try {
      const created = await addAddress.mutate();
      await addresses.refetch();
      setAddressId(created.id);
      setShowNewAddress(false);
    } catch {
      /* toast */
    }
  }

  async function onPlaceOrder(e: FormEvent) {
    e.preventDefault();
    if (!addressId) return;
    try {
      const order = await checkout.mutate();
      if (paymentMethod === "online") {
        await ordersApi.confirmPayment(order.id, "demo-payment");
      }
      router.push(`/account/orders/${order.id}?placed=1`);
    } catch {
      /* toast */
    }
  }

  return (
    <StoreShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="text-sm text-[var(--fs-muted)]">
          <Link href="/cart" className="hover:text-[var(--fs-leaf)]">
            ← Cart
          </Link>
        </nav>
        <h1 className="mt-4 font-[family-name:var(--font-fraunces)] text-3xl tracking-tight sm:text-4xl">
          Checkout
        </h1>

        {cart.isLoading && <p className="mt-8 text-sm text-[var(--fs-muted)]">Loading…</p>}
        {empty && (
          <div className="mt-12 text-center">
            <p className="text-[var(--fs-muted)]">Your cart is empty.</p>
            <Link href="/shop" className="mt-4 inline-block text-[var(--fs-leaf)] hover:underline">
              Go shopping →
            </Link>
          </div>
        )}

        {cart.data && cart.data.items.length > 0 && (
          <form onSubmit={onPlaceOrder} className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              <section className="rounded-2xl border border-[var(--fs-line)] bg-white p-5 sm:p-6">
                <h2 className="font-[family-name:var(--font-fraunces)] text-xl">Delivery address</h2>
                {(addresses.data?.length ?? 0) > 0 && (
                  <ul className="mt-4 space-y-2">
                    {addresses.data!.map((a) => (
                      <li key={a.id}>
                        <label className="flex cursor-pointer gap-3 rounded-xl border border-[var(--fs-line)] p-4 transition has-[:checked]:border-[var(--fs-leaf)] has-[:checked]:bg-[var(--fs-mist)]/50">
                          <input
                            type="radio"
                            name="address"
                            value={a.id}
                            checked={addressId === a.id}
                            onChange={() => setAddressId(a.id)}
                            className="mt-1"
                          />
                          <span className="text-sm">
                            <span className="font-medium capitalize">{a.label}</span>
                            <span className="mt-1 block whitespace-pre-line text-[var(--fs-muted)]">
                              {[a.line1, a.line2, `${a.city}, ${a.state} ${a.postal_code}`]
                                .filter(Boolean)
                                .join("\n")}
                            </span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
                {!showNewAddress ? (
                  <button
                    type="button"
                    className="mt-4 text-sm font-medium text-[var(--fs-leaf)] hover:underline"
                    onClick={() => setShowNewAddress(true)}
                  >
                    + Add new address
                  </button>
                ) : (
                  <div className="mt-4 rounded-xl border border-[var(--fs-line)] bg-[var(--fs-mist)]/30 p-4 space-y-3">
                    <input
                      className="w-full rounded-xl border border-[var(--fs-line)] px-3 py-2 text-sm"
                      placeholder="Address line 1"
                      value={newAddress.line1}
                      onChange={(e) => setNewAddress({ ...newAddress, line1: e.target.value })}
                      required={showNewAddress}
                    />
                    <input
                      className="w-full rounded-xl border border-[var(--fs-line)] px-3 py-2 text-sm"
                      placeholder="Address line 2 (optional)"
                      value={newAddress.line2}
                      onChange={(e) => setNewAddress({ ...newAddress, line2: e.target.value })}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        className="rounded-xl border border-[var(--fs-line)] px-3 py-2 text-sm"
                        placeholder="City"
                        value={newAddress.city}
                        onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                      />
                      <input
                        className="rounded-xl border border-[var(--fs-line)] px-3 py-2 text-sm"
                        placeholder="State"
                        value={newAddress.state}
                        onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                      />
                    </div>
                    <input
                      className="w-full rounded-xl border border-[var(--fs-line)] px-3 py-2 text-sm"
                      placeholder="Postal code"
                      value={newAddress.postal_code}
                      onChange={(e) =>
                        setNewAddress({ ...newAddress, postal_code: e.target.value })
                      }
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={addAddress.isLoading}
                        className="rounded-full bg-[var(--fs-leaf-deep)] px-4 py-2 text-sm font-semibold text-white"
                        onClick={onAddAddress}
                      >
                        Save address
                      </button>
                      <button
                        type="button"
                        className="rounded-full px-4 py-2 text-sm text-[var(--fs-muted)]"
                        onClick={() => setShowNewAddress(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-[var(--fs-line)] bg-white p-5 sm:p-6">
                <h2 className="font-[family-name:var(--font-fraunces)] text-xl">Coupon</h2>
                <p className="mt-1 text-xs text-[var(--fs-muted)]">
                  Pick an available offer or enter a code
                </p>

                {availableCoupons.isLoading && (
                  <p className="mt-4 text-sm text-[var(--fs-muted)]">Loading offers…</p>
                )}
                {availableCoupons.data && availableCoupons.data.items.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {availableCoupons.data.items.map((offer) => {
                      const selected =
                        appliedCoupon?.valid &&
                        appliedCoupon.code.toUpperCase() === offer.code.toUpperCase();
                      return (
                        <li
                          key={offer.code}
                          className={`rounded-xl border p-3 transition ${
                            selected
                              ? "border-[var(--fs-leaf)] bg-[var(--fs-mist)]/60"
                              : "border-[var(--fs-line)] bg-[var(--fs-mist)]/20"
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-mono text-sm font-semibold tracking-wide text-[var(--fs-leaf-deep)]">
                                {offer.code}
                              </p>
                              <p className="mt-0.5 text-sm font-medium text-[var(--fs-ink)]">
                                {offer.name}
                                <span className="ml-2 text-xs font-normal text-[var(--fs-muted)]">
                                  {couponOfferLabel(offer)}
                                </span>
                              </p>
                              {offer.description && (
                                <p className="mt-1 text-xs text-[var(--fs-muted)]">
                                  {offer.description}
                                </p>
                              )}
                              {offer.applicable ? (
                                Number(offer.estimated_discount) > 0 ? (
                                  <p className="mt-1 text-xs text-[var(--fs-leaf-deep)]">
                                    Save {formatMoney(offer.estimated_discount)} on this cart
                                  </p>
                                ) : offer.discount_type === "free_shipping" ? (
                                  <p className="mt-1 text-xs text-[var(--fs-leaf-deep)]">
                                    Free shipping on this cart
                                  </p>
                                ) : null
                              ) : (
                                <p className="mt-1 text-xs text-amber-700">
                                  {offer.reason || "Not available for this cart"}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              disabled={
                                !offer.applicable || applyCoupon.isLoading || Boolean(selected)
                              }
                              className="shrink-0 rounded-full bg-[var(--fs-leaf-deep)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--fs-leaf)] disabled:opacity-40"
                              onClick={async () => {
                                try {
                                  await applyCoupon.mutate(offer.code);
                                  await availableCoupons.refetch();
                                } catch {
                                  setAppliedCoupon(null);
                                  setCouponError("Could not apply coupon");
                                }
                              }}
                            >
                              {selected ? "Applied" : "Apply"}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {availableCoupons.data && availableCoupons.data.items.length === 0 && (
                  <p className="mt-4 text-sm text-[var(--fs-muted)]">
                    No public offers right now — you can still enter a code below.
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <input
                    className="min-w-[160px] flex-1 rounded-xl border border-[var(--fs-line)] px-3 py-2 text-sm uppercase outline-none focus:border-[var(--fs-leaf)]"
                    placeholder="Have a code?"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value.toUpperCase());
                      setCouponError(null);
                    }}
                  />
                  <button
                    type="button"
                    disabled={applyCoupon.isLoading || !couponInput.trim()}
                    className="rounded-full bg-[var(--fs-mist)] px-4 py-2 text-sm font-medium text-[var(--fs-leaf-deep)] hover:bg-[var(--fs-leaf)]/15 disabled:opacity-50"
                    onClick={async () => {
                      try {
                        await applyCoupon.mutate(couponInput.trim());
                        await availableCoupons.refetch();
                      } catch {
                        setAppliedCoupon(null);
                        setCouponError("Could not apply coupon");
                      }
                    }}
                  >
                    {applyCoupon.isLoading ? "Checking…" : "Apply"}
                  </button>
                  {appliedCoupon?.valid && (
                    <button
                      type="button"
                      className="rounded-full px-3 py-2 text-sm text-[var(--fs-muted)] hover:text-rose-600"
                      onClick={() => {
                        setAppliedCoupon(null);
                        setCouponInput("");
                        setCouponError(null);
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                {appliedCoupon?.valid && (
                  <p className="mt-2 text-sm text-[var(--fs-leaf-deep)]">
                    {appliedCoupon.code} applied — you save{" "}
                    {formatMoney(appliedCoupon.discount_amount)}
                    {appliedCoupon.discount_type === "free_shipping" ? " (free shipping)" : ""}
                  </p>
                )}
                {couponError && <p className="mt-2 text-sm text-rose-600">{couponError}</p>}
              </section>

              <section className="rounded-2xl border border-[var(--fs-line)] bg-white p-5 sm:p-6">
                <h2 className="font-[family-name:var(--font-fraunces)] text-xl">Payment</h2>
                <div className="mt-4 space-y-2">
                  {(
                    [
                      { value: "cod" as const, label: "Cash on delivery", hint: "Pay when fruit arrives" },
                      { value: "online" as const, label: "Pay online", hint: "Demo — auto-confirms" },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.value}
                      className="flex cursor-pointer gap-3 rounded-xl border border-[var(--fs-line)] p-4 transition has-[:checked]:border-[var(--fs-leaf)] has-[:checked]:bg-[var(--fs-mist)]/50"
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={opt.value}
                        checked={paymentMethod === opt.value}
                        onChange={() => setPaymentMethod(opt.value)}
                        className="mt-1"
                      />
                      <span>
                        <span className="text-sm font-medium">{opt.label}</span>
                        <span className="block text-xs text-[var(--fs-muted)]">{opt.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-[var(--fs-line)] bg-white p-5 sm:p-6">
                <label className="block text-sm">
                  <span className="font-[family-name:var(--font-fraunces)] text-xl">Order notes</span>
                  <span className="mt-1 block text-xs text-[var(--fs-muted)]">Optional delivery instructions</span>
                  <textarea
                    className="mt-3 w-full rounded-xl border border-[var(--fs-line)] px-3 py-2 text-sm outline-none focus:border-[var(--fs-leaf)]"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ring the bell, leave at door…"
                  />
                </label>
              </section>
            </div>

            <aside className="h-fit rounded-2xl border border-[var(--fs-line)] bg-white p-5 shadow-sm">
              <h2 className="font-[family-name:var(--font-fraunces)] text-xl">Order summary</h2>
              <ul className="mt-4 space-y-3 border-b border-[var(--fs-line)] pb-4 text-sm">
                {cart.data.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-2">
                    <span className="text-[var(--fs-muted)]">
                      {item.quantity}× {item.product_name}
                    </span>
                    <span>{formatMoney(item.line_subtotal)}</span>
                  </li>
                ))}
              </ul>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[var(--fs-muted)]">Subtotal</dt>
                  <dd>
                    {formatMoney(appliedCoupon?.valid ? appliedCoupon.subtotal : cart.data.subtotal)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--fs-muted)]">Tax</dt>
                  <dd>
                    {formatMoney(
                      appliedCoupon?.valid ? appliedCoupon.tax_amount : cart.data.tax_amount,
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--fs-muted)]">Shipping</dt>
                  <dd>
                    {Number(
                      appliedCoupon?.valid
                        ? appliedCoupon.shipping_amount
                        : cart.data.shipping_amount,
                    ) === 0
                      ? "Free"
                      : formatMoney(
                          appliedCoupon?.valid
                            ? appliedCoupon.shipping_amount
                            : cart.data.shipping_amount,
                        )}
                  </dd>
                </div>
                {appliedCoupon?.valid && Number(appliedCoupon.discount_amount) > 0 && (
                  <div className="flex justify-between text-[var(--fs-leaf-deep)]">
                    <dt>Discount ({appliedCoupon.code})</dt>
                    <dd>−{formatMoney(appliedCoupon.discount_amount)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-[var(--fs-line)] pt-2 font-semibold">
                  <dt>Total</dt>
                  <dd>
                    {formatMoney(appliedCoupon?.valid ? appliedCoupon.total : cart.data.total)}
                  </dd>
                </div>
              </dl>
              <button
                type="submit"
                disabled={!addressId || checkout.isLoading}
                className="mt-5 w-full rounded-full bg-[var(--fs-mango)] py-3 text-sm font-semibold text-[var(--fs-orchard)] hover:bg-[var(--fs-citrus)] disabled:opacity-50"
              >
                {checkout.isLoading ? "Placing order…" : "Place order"}
              </button>
            </aside>
          </form>
        )}
      </div>
    </StoreShell>
  );
}
