"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useAuth, useMutation, useQuery } from "@fruitshop/web-core";

import { StarPicker, StarRating } from "@/src/components/StarRating";
import {
  averageRatingNumber,
  formatReviewDate,
  reviewsApi,
  type Review,
} from "@/src/modules/reviews/api";

function breakdownCount(
  breakdown: Record<string, number> | Record<number, number> | undefined,
  star: number,
): number {
  if (!breakdown) return 0;
  const keyed = breakdown as Record<string, number>;
  return keyed[String(star)] ?? keyed[star as unknown as string] ?? 0;
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <li className="border-b border-[var(--fs-line)] px-5 py-5 last:border-b-0 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StarRating value={review.rating} size="sm" />
          <span className="text-sm font-extrabold text-[var(--fs-ink)]">
            {review.author_name || "Customer"}
          </span>
          {review.is_verified_purchase && (
            <span className="rounded-full bg-[var(--fs-mist)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--fs-accent-deep)]">
              Verified
            </span>
          )}
        </div>
        <time className="text-xs font-medium text-[var(--fs-muted)]">
          {formatReviewDate(review.created_at)}
        </time>
      </div>
      {review.title ? (
        <p className="mt-2 text-sm font-extrabold text-[var(--fs-ink)]">{review.title}</p>
      ) : null}
      {review.body ? (
        <p className="mt-1.5 text-sm font-medium leading-relaxed text-[var(--fs-muted)]">
          {review.body}
        </p>
      ) : null}
    </li>
  );
}

export function ProductReviewsSection({
  productId,
  averageRating,
  reviewCount,
  ratingBreakdown,
  productSlug,
  onReviewChanged,
}: {
  productId: string;
  averageRating?: string | number;
  reviewCount?: number;
  ratingBreakdown?: Record<string, number> | Record<number, number>;
  productSlug: string;
  onReviewChanged?: () => void;
}) {
  const { isAuthenticated } = useAuth();
  const [page, setPage] = useState(1);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [showForm, setShowForm] = useState(false);

  const list = useQuery(
    () => reviewsApi.listForProduct(productId, { page, page_size: 10 }),
    [productId, page],
  );
  const eligibility = useQuery(
    () => reviewsApi.eligibility(productId),
    [productId, isAuthenticated],
    { enabled: isAuthenticated },
  );

  const create = useMutation(() =>
    reviewsApi.create({
      product_id: productId,
      rating,
      title: title.trim() || null,
      body: body.trim() || null,
    }),
  );

  const avg = averageRatingNumber(averageRating);
  const count = reviewCount ?? list.data?.total ?? 0;
  const totalPages = list.data
    ? Math.max(1, Math.ceil(list.data.total / list.data.page_size))
    : 1;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await create.mutate();
      setTitle("");
      setBody("");
      setRating(5);
      setShowForm(false);
      await Promise.all([list.refetch(), eligibility.refetch()]);
      onReviewChanged?.();
    } catch {
      /* toast */
    }
  }

  const canWrite = isAuthenticated && eligibility.data?.can_review;
  const existingId = eligibility.data?.existing_review_id;

  return (
    <section className="mt-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="fs-eyebrow">Ratings</p>
          <h2 className="fs-section-title mt-1 text-2xl">Customer reviews</h2>
        </div>
        {isAuthenticated ? (
          canWrite ? (
            <button
              type="button"
              className="fs-btn-primary !py-2.5"
              onClick={() => setShowForm((v) => !v)}
            >
              {showForm ? "Cancel" : "Write a review"}
            </button>
          ) : existingId ? (
            <Link
              href="/account/reviews"
              className="text-sm font-extrabold text-[var(--fs-accent)] hover:underline"
            >
              Manage your review →
            </Link>
          ) : null
        ) : (
          <Link
            href={`/login?next=/product/${productSlug}`}
            className="text-sm font-extrabold text-[var(--fs-accent)] hover:underline"
          >
            Sign in to review
          </Link>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="rounded-2xl border border-[var(--fs-line)] bg-white p-5 shadow-[var(--fs-shadow-sm)]">
          <p className="text-4xl font-extrabold tabular-nums text-[var(--fs-ink)]">
            {count > 0 ? avg.toFixed(1) : "—"}
          </p>
          <StarRating value={avg} className="mt-2" />
          <p className="mt-2 text-sm font-medium text-[var(--fs-muted)]">
            {count === 0
              ? "No reviews yet"
              : `${count} review${count === 1 ? "" : "s"}`}
          </p>

          {count > 0 && (
            <ul className="mt-5 space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const n = breakdownCount(ratingBreakdown, star);
                const pct = count > 0 ? Math.round((n / count) * 100) : 0;
                return (
                  <li key={star} className="flex items-center gap-2 text-xs font-bold">
                    <span className="w-3 tabular-nums text-[var(--fs-muted)]">{star}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--fs-mist)]">
                      <div
                        className="h-full rounded-full bg-[var(--fs-accent)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right tabular-nums text-[var(--fs-muted)]">{n}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="min-w-0 space-y-4">
          {showForm && canWrite && (
            <form
              onSubmit={onSubmit}
              className="rounded-2xl border border-[var(--fs-line)] bg-white p-5 shadow-[var(--fs-shadow-sm)]"
            >
              <p className="text-sm font-extrabold text-[var(--fs-ink)]">Your rating</p>
              <div className="mt-2">
                <StarPicker value={rating} onChange={setRating} disabled={create.isLoading} />
              </div>
              <label className="mt-4 block text-sm font-bold text-[var(--fs-ink)]">
                Title
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  placeholder="Sum it up"
                  className="mt-1.5 w-full rounded-xl border border-[var(--fs-line)] bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--fs-accent)] focus:ring-2 focus:ring-[var(--fs-accent)]/15"
                />
              </label>
              <label className="mt-3 block text-sm font-bold text-[var(--fs-ink)]">
                Review
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  maxLength={4000}
                  placeholder="How was the fruit?"
                  className="mt-1.5 w-full resize-y rounded-xl border border-[var(--fs-line)] bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--fs-accent)] focus:ring-2 focus:ring-[var(--fs-accent)]/15"
                />
              </label>
              <button
                type="submit"
                disabled={create.isLoading || rating < 1}
                className="fs-btn-primary mt-4 disabled:opacity-60"
              >
                {create.isLoading ? "Submitting…" : "Submit review"}
              </button>
            </form>
          )}

          {isAuthenticated && eligibility.data && !eligibility.data.can_review && !existingId && (
            <p className="rounded-2xl border border-[var(--fs-line)] bg-[var(--fs-mist)]/50 px-5 py-4 text-sm font-medium text-[var(--fs-muted)]">
              {eligibility.data.reason ||
                "Buy and receive this fruit before leaving a review."}
            </p>
          )}

          <div className="overflow-hidden rounded-2xl border border-[var(--fs-line)] bg-white shadow-[var(--fs-shadow-sm)]">
            {list.isLoading && (
              <div className="space-y-4 p-5" role="status" aria-label="Loading reviews">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="fs-skeleton h-4 w-32" />
                    <div className="fs-skeleton h-3 w-full" />
                    <div className="fs-skeleton h-3 w-4/5" />
                  </div>
                ))}
              </div>
            )}
            {list.error && (
              <p className="px-5 py-8 text-center text-sm font-semibold text-rose-600">
                {list.error.message}
              </p>
            )}
            {list.data && list.data.items.length === 0 && (
              <p className="px-5 py-10 text-center text-sm font-medium text-[var(--fs-muted)]">
                Be the first to share how this fruit tasted.
              </p>
            )}
            {list.data && list.data.items.length > 0 && (
              <>
                <ul>
                  {list.data.items.map((r) => (
                    <ReviewCard key={r.id} review={r} />
                  ))}
                </ul>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-[var(--fs-line)] px-5 py-3 text-sm">
                    <span className="font-medium text-[var(--fs-muted)]">
                      Page {page} of {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={page <= 1}
                        className="rounded-lg px-3 py-1.5 font-bold text-[var(--fs-ink)] hover:bg-[var(--fs-mist)] disabled:opacity-40"
                        onClick={() => setPage((p) => p - 1)}
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        disabled={page >= totalPages}
                        className="rounded-lg px-3 py-1.5 font-bold text-[var(--fs-ink)] hover:bg-[var(--fs-mist)] disabled:opacity-40"
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
