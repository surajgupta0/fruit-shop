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

const inputClass =
  "w-full rounded-xl border border-[var(--fs-line)] bg-white px-3.5 py-2.5 text-sm font-medium outline-none transition focus:border-[var(--fs-accent)] focus:ring-2 focus:ring-[var(--fs-accent)]/15";

function CheckoutSkeleton() {
  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]" role="status" aria-label="Loading checkout">
      <div className="space-y-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[var(--fs-line)] bg-white p-5">
            <div className="fs-skeleton h-5 w-40" />
            <div className="mt-4 space-y-3">
              <div className="fs-skeleton h-16 w-full !rounded-xl" />
              <div className="fs-skeleton h-16 w-full !rounded-xl" />
            </div>
          </div>
        ))}
      </div>
      <div className="h-fit rounded-2xl border border-[var(--fs-line)] bg-white p-5">
        <div className="fs-skeleton h-6 w-36" />
        <div className="mt-4 space-y-3">
          <div className="fs-skeleton h-4 w-full" />
          <div className="fs-skeleton h-4 w-full" />
          <div className="fs-skeleton h-4 w-3/4" />
        </div>
        <div className="mt-5 space-y-2 border-t border-[var(--fs-line)] pt-4">
          <div className="fs-skeleton h-4 w-full" />
          <div className="fs-skeleton h-4 w-full" />
          <div className="fs-skeleton h-5 w-full" />
        </div>
        <div className="fs-skeleton mt-6 h-12 w-full !rounded-full" />
      </div>
    </div>
  );
}

function CouponOfferSkeleton() {
  return (
    <div className="mt-4 space-y-2" role="status" aria-label="Loading offers">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="fs-skeleton h-24 w-full !rounded-xl" />
      ))}
    </div>
  );
}

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
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          <div className="fs-skeleton h-4 w-20" />
          <div className="fs-skeleton mt-3 h-9 w-48" />
          <CheckoutSkeleton />
        </div>
      </StoreShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <StoreShell>
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <p className="fs-eyebrow">Checkout</p>
          <h1 className="fs-section-title mt-2 text-3xl">Sign in to order</h1>
          <p className="mt-3 text-sm font-medium text-[var(--fs-muted)]">
            Complete your fruit order securely with OTP login.
          </p>
          <Link href="/login?next=/checkout" className="fs-btn-primary mt-8 inline-flex">
            Sign in
          </Link>
        </div>
      </StoreShell>
    );
  }

  const empty = cart.data && cart.data.items.length === 0;
  const summarySubtotal = appliedCoupon?.valid ? appliedCoupon.subtotal : cart.data?.subtotal;
  const summaryTax = appliedCoupon?.valid ? appliedCoupon.tax_amount : cart.data?.tax_amount;
  const summaryShipping = appliedCoupon?.valid
    ? appliedCoupon.shipping_amount
    : cart.data?.shipping_amount;
  const summaryTotal = appliedCoupon?.valid ? appliedCoupon.total : cart.data?.total;

  async function onAddAddress(e?: FormEvent) {
    e?.preventDefault();
    if (
      !newAddress.line1.trim() ||
      !newAddress.city.trim() ||
      !newAddress.state.trim() ||
      !newAddress.postal_code.trim()
    ) {
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
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <nav className="text-sm font-bold text-[var(--fs-muted)]">
          <Link href="/cart" className="hover:text-[var(--fs-accent)]">
            ← Back to cart
          </Link>
        </nav>
        <p className="fs-eyebrow mt-4">Checkout</p>
        <h1 className="fs-section-title mt-1 text-3xl sm:text-4xl">Order summary</h1>
        <p className="mt-2 text-sm font-medium text-[var(--fs-muted)]">
          Confirm delivery, apply offers, and place your order.
        </p>

        {cart.isLoading && <CheckoutSkeleton />}

        {empty && (
          <div className="mt-10 rounded-2xl border border-dashed border-[var(--fs-line)] bg-white px-6 py-16 text-center shadow-[var(--fs-shadow-sm)]">
            <p className="text-xl font-extrabold text-[var(--fs-ink)]">Your cart is empty</p>
            <p className="mt-2 text-sm font-medium text-[var(--fs-muted)]">
              Add fruit before checking out.
            </p>
            <Link href="/shop" className="fs-btn-primary mt-6 inline-flex">
              Go shopping
            </Link>
          </div>
        )}

        {cart.data && cart.data.items.length > 0 && (
          <form onSubmit={onPlaceOrder} className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
            <div className="space-y-5">
              {/* Address */}
              <section className="rounded-2xl border border-[var(--fs-line)] bg-white p-5 shadow-[var(--fs-shadow-sm)] sm:p-6">
                <h2 className="text-lg font-extrabold text-[var(--fs-ink)]">Delivery address</h2>
                {addresses.isLoading && (
                  <div className="mt-4 space-y-2">
                    <div className="fs-skeleton h-20 w-full !rounded-xl" />
                    <div className="fs-skeleton h-20 w-full !rounded-xl" />
                  </div>
                )}
                {(addresses.data?.length ?? 0) > 0 && (
                  <ul className="mt-4 space-y-2">
                    {addresses.data!.map((a) => (
                      <li key={a.id}>
                        <label
                          className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${
                            addressId === a.id
                              ? "border-[var(--fs-accent)] bg-[var(--fs-mist)]/60"
                              : "border-[var(--fs-line)] hover:border-[var(--fs-accent)]/40"
                          }`}
                        >
                          <input
                            type="radio"
                            name="address"
                            value={a.id}
                            checked={addressId === a.id}
                            onChange={() => setAddressId(a.id)}
                            className="mt-1 accent-[var(--fs-accent)]"
                          />
                          <span className="text-sm">
                            <span className="font-extrabold capitalize text-[var(--fs-ink)]">
                              {a.label}
                              {a.is_default ? (
                                <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--fs-accent-deep)] ring-1 ring-[var(--fs-line)]">
                                  Default
                                </span>
                              ) : null}
                            </span>
                            <span className="mt-1 block whitespace-pre-line font-medium text-[var(--fs-muted)]">
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
                {!addresses.isLoading && (addresses.data?.length ?? 0) === 0 && !showNewAddress && (
                  <p className="mt-3 text-sm font-medium text-[var(--fs-muted)]">
                    Add an address to continue.
                  </p>
                )}
                {!showNewAddress ? (
                  <button
                    type="button"
                    className="mt-4 text-sm font-bold text-[var(--fs-accent)] hover:underline"
                    onClick={() => setShowNewAddress(true)}
                  >
                    + Add new address
                  </button>
                ) : (
                  <div className="mt-4 space-y-3 rounded-xl border border-[var(--fs-line)] bg-[var(--fs-canvas)] p-4">
                    <select
                      className={inputClass}
                      value={newAddress.label}
                      onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                    >
                      <option value="home">Home</option>
                      <option value="work">Work</option>
                      <option value="other">Other</option>
                    </select>
                    <input
                      className={inputClass}
                      placeholder="Address line 1"
                      value={newAddress.line1}
                      onChange={(e) => setNewAddress({ ...newAddress, line1: e.target.value })}
                      required={showNewAddress}
                    />
                    <input
                      className={inputClass}
                      placeholder="Address line 2 (optional)"
                      value={newAddress.line2}
                      onChange={(e) => setNewAddress({ ...newAddress, line2: e.target.value })}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        className={inputClass}
                        placeholder="City"
                        value={newAddress.city}
                        onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                      />
                      <input
                        className={inputClass}
                        placeholder="State"
                        value={newAddress.state}
                        onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                      />
                    </div>
                    <input
                      className={inputClass}
                      placeholder="Postal code"
                      value={newAddress.postal_code}
                      onChange={(e) =>
                        setNewAddress({ ...newAddress, postal_code: e.target.value })
                      }
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={addAddress.isLoading}
                        className="fs-btn-primary !py-2.5"
                        onClick={onAddAddress}
                      >
                        {addAddress.isLoading ? "Saving…" : "Save address"}
                      </button>
                      <button
                        type="button"
                        className="rounded-full px-4 py-2.5 text-sm font-bold text-[var(--fs-muted)] hover:bg-white"
                        onClick={() => setShowNewAddress(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* Coupons */}
              <section className="rounded-2xl border border-[var(--fs-line)] bg-white p-5 shadow-[var(--fs-shadow-sm)] sm:p-6">
                <h2 className="text-lg font-extrabold text-[var(--fs-ink)]">Coupon</h2>
                <p className="mt-1 text-xs font-medium text-[var(--fs-muted)]">
                  Pick an available offer or enter a code
                </p>

                {availableCoupons.isLoading && <CouponOfferSkeleton />}

                {availableCoupons.data && availableCoupons.data.items.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {availableCoupons.data.items.map((offer) => {
                      const selected =
                        appliedCoupon?.valid &&
                        appliedCoupon.code.toUpperCase() === offer.code.toUpperCase();
                      return (
                        <li
                          key={offer.code}
                          className={`rounded-xl border p-3.5 transition ${
                            selected
                              ? "border-[var(--fs-accent)] bg-[var(--fs-mist)]/70"
                              : "border-[var(--fs-line)] bg-[var(--fs-canvas)]"
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-mono text-sm font-extrabold tracking-wide text-[var(--fs-accent-deep)]">
                                {offer.code}
                              </p>
                              <p className="mt-0.5 text-sm font-bold text-[var(--fs-ink)]">
                                {offer.name}
                                <span className="ml-2 text-xs font-semibold text-[var(--fs-muted)]">
                                  {couponOfferLabel(offer)}
                                </span>
                              </p>
                              {offer.description && (
                                <p className="mt-1 text-xs font-medium text-[var(--fs-muted)]">
                                  {offer.description}
                                </p>
                              )}
                              {offer.applicable ? (
                                Number(offer.estimated_discount) > 0 ? (
                                  <p className="mt-1 text-xs font-bold text-[var(--fs-accent-deep)]">
                                    Save {formatMoney(offer.estimated_discount)} on this cart
                                  </p>
                                ) : offer.discount_type === "free_shipping" ? (
                                  <p className="mt-1 text-xs font-bold text-[var(--fs-accent-deep)]">
                                    Free shipping on this cart
                                  </p>
                                ) : null
                              ) : (
                                <p className="mt-1 text-xs font-bold text-amber-700">
                                  {offer.reason || "Not available for this cart"}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              disabled={
                                !offer.applicable || applyCoupon.isLoading || Boolean(selected)
                              }
                              className="shrink-0 rounded-full bg-[var(--fs-accent)] px-3.5 py-1.5 text-xs font-extrabold text-white hover:bg-[var(--fs-accent-deep)] disabled:opacity-40"
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
                  <p className="mt-4 text-sm font-medium text-[var(--fs-muted)]">
                    No public offers right now — you can still enter a code below.
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <input
                    className={`${inputClass} min-w-[160px] flex-1 uppercase`}
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
                    className="rounded-full bg-[var(--fs-mist)] px-4 py-2.5 text-sm font-bold text-[var(--fs-accent-deep)] hover:bg-[#ffe0c8] disabled:opacity-50"
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
                      className="rounded-full px-3 py-2.5 text-sm font-bold text-[var(--fs-muted)] hover:text-rose-600"
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
                  <p className="mt-3 text-sm font-bold text-[var(--fs-accent-deep)]">
                    {appliedCoupon.code} applied — you save{" "}
                    {formatMoney(appliedCoupon.discount_amount)}
                    {appliedCoupon.discount_type === "free_shipping" ? " (free shipping)" : ""}
                  </p>
                )}
                {couponError && (
                  <p className="mt-2 text-sm font-semibold text-rose-600">{couponError}</p>
                )}
              </section>

              {/* Payment */}
              <section className="rounded-2xl border border-[var(--fs-line)] bg-white p-5 shadow-[var(--fs-shadow-sm)] sm:p-6">
                <h2 className="text-lg font-extrabold text-[var(--fs-ink)]">Payment</h2>
                <div className="mt-4 space-y-2">
                  {(
                    [
                      {
                        value: "cod" as const,
                        label: "Cash on delivery",
                        hint: "Pay when fruit arrives",
                      },
                      {
                        value: "online" as const,
                        label: "Pay online",
                        hint: "Demo — auto-confirms",
                      },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${
                        paymentMethod === opt.value
                          ? "border-[var(--fs-accent)] bg-[var(--fs-mist)]/60"
                          : "border-[var(--fs-line)] hover:border-[var(--fs-accent)]/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={opt.value}
                        checked={paymentMethod === opt.value}
                        onChange={() => setPaymentMethod(opt.value)}
                        className="mt-1 accent-[var(--fs-accent)]"
                      />
                      <span>
                        <span className="text-sm font-extrabold text-[var(--fs-ink)]">
                          {opt.label}
                        </span>
                        <span className="mt-0.5 block text-xs font-medium text-[var(--fs-muted)]">
                          {opt.hint}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </section>

              {/* Notes */}
              <section className="rounded-2xl border border-[var(--fs-line)] bg-white p-5 shadow-[var(--fs-shadow-sm)] sm:p-6">
                <label className="block">
                  <span className="text-lg font-extrabold text-[var(--fs-ink)]">Order notes</span>
                  <span className="mt-1 block text-xs font-medium text-[var(--fs-muted)]">
                    Optional delivery instructions
                  </span>
                  <textarea
                    className={`${inputClass} mt-3`}
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ring the bell, leave at door…"
                  />
                </label>
              </section>
            </div>

            {/* Order summary sidebar */}
            <aside className="h-fit rounded-2xl border border-[var(--fs-line)] bg-white p-5 shadow-[var(--fs-shadow-sm)] lg:sticky lg:top-24">
              <h2 className="text-lg font-extrabold text-[var(--fs-ink)]">Order summary</h2>
              <ul className="mt-4 space-y-3 border-b border-[var(--fs-line)] pb-4">
                {cart.data.items.map((item) => (
                  <li key={item.id} className="flex gap-3 text-sm">
                    <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-[var(--fs-mist)]">
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
                      <p className="font-bold text-[var(--fs-ink)] line-clamp-1">
                        {item.product_name}
                      </p>
                      <p className="text-xs font-medium text-[var(--fs-muted)]">
                        {item.quantity} × {formatMoney(item.unit_price)}
                      </p>
                    </div>
                    <span className="shrink-0 font-extrabold">
                      {formatMoney(item.line_subtotal)}
                    </span>
                  </li>
                ))}
              </ul>
              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="font-medium text-[var(--fs-muted)]">Subtotal</dt>
                  <dd className="font-semibold">{formatMoney(summarySubtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium text-[var(--fs-muted)]">Tax</dt>
                  <dd className="font-semibold">{formatMoney(summaryTax)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium text-[var(--fs-muted)]">Shipping</dt>
                  <dd className="font-semibold">
                    {Number(summaryShipping) === 0 ? "Free" : formatMoney(summaryShipping)}
                  </dd>
                </div>
                {appliedCoupon?.valid && Number(appliedCoupon.discount_amount) > 0 && (
                  <div className="flex justify-between text-[var(--fs-accent-deep)]">
                    <dt className="font-medium">Discount ({appliedCoupon.code})</dt>
                    <dd className="font-semibold">−{formatMoney(appliedCoupon.discount_amount)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-[var(--fs-line)] pt-2.5 text-base font-extrabold">
                  <dt>Total</dt>
                  <dd>{formatMoney(summaryTotal)}</dd>
                </div>
              </dl>
              {!addressId && (
                <p className="mt-3 text-xs font-bold text-amber-700">
                  Select or add a delivery address to place your order.
                </p>
              )}
              <button
                type="submit"
                disabled={!addressId || checkout.isLoading}
                className="fs-btn-primary mt-5 w-full disabled:opacity-50"
              >
                {checkout.isLoading ? "Placing order…" : "Place order"}
              </button>
              <Link
                href="/cart"
                className="mt-3 block text-center text-sm font-bold text-[var(--fs-accent)] hover:underline"
              >
                Edit cart
              </Link>
            </aside>
          </form>
        )}
      </div>
    </StoreShell>
  );
}
