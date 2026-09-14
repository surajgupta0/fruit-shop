"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "@fruitshop/web-core";

import {
  AccountCard,
  AccountEmpty,
  AccountLoader,
  AccountShell,
  accountInputClass,
} from "@/src/components/AccountShell";
import { RequireAuth } from "@/src/components/RequireAuth";
import { StarPicker, StarRating } from "@/src/components/StarRating";
import {
  formatReviewDate,
  reviewsApi,
  type Review,
} from "@/src/modules/reviews/api";

function statusLabel(status: string) {
  if (status === "approved") return "Published";
  if (status === "pending") return "Pending";
  if (status === "rejected") return "Rejected";
  if (status === "hidden") return "Hidden";
  return status;
}

function MyReviewRow({
  review,
  onChanged,
}: {
  review: Review;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(review.rating);
  const [title, setTitle] = useState(review.title ?? "");
  const [body, setBody] = useState(review.body ?? "");

  const update = useMutation(() =>
    reviewsApi.update(review.id, {
      rating,
      title: title.trim() || null,
      body: body.trim() || null,
    }),
  );
  const remove = useMutation(() => reviewsApi.delete(review.id));

  async function onSave(e: FormEvent) {
    e.preventDefault();
    try {
      await update.mutate();
      setEditing(false);
      onChanged();
    } catch {
      /* toast */
    }
  }

  return (
    <li className="border-b border-[var(--fs-line)] px-5 py-5 last:border-b-0 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {review.product_slug ? (
            <Link
              href={`/product/${review.product_slug}`}
              className="font-extrabold text-[var(--fs-ink)] hover:text-[var(--fs-accent-deep)]"
            >
              {review.product_name || "Product"}
            </Link>
          ) : (
            <p className="font-extrabold text-[var(--fs-ink)]">
              {review.product_name || "Product"}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <StarRating value={review.rating} size="sm" />
            <span className="rounded-full bg-[var(--fs-mist)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--fs-accent-deep)]">
              {statusLabel(String(review.status))}
            </span>
            <span className="text-xs font-medium text-[var(--fs-muted)]">
              {formatReviewDate(review.created_at)}
            </span>
          </div>
        </div>
        {!editing && review.status !== "hidden" && (
          <div className="flex gap-2">
            <button
              type="button"
              className="text-xs font-extrabold text-[var(--fs-accent-deep)] hover:underline"
              onClick={() => {
                setRating(review.rating);
                setTitle(review.title ?? "");
                setBody(review.body ?? "");
                setEditing(true);
              }}
            >
              Edit
            </button>
            <button
              type="button"
              className="text-xs font-extrabold text-rose-600 hover:underline"
              onClick={async () => {
                if (!confirm("Remove this review?")) return;
                try {
                  await remove.mutate();
                  onChanged();
                } catch {
                  /* toast */
                }
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {!editing && (
        <>
          {review.title ? (
            <p className="mt-3 text-sm font-extrabold text-[var(--fs-ink)]">{review.title}</p>
          ) : null}
          {review.body ? (
            <p className="mt-1 text-sm font-medium text-[var(--fs-muted)]">{review.body}</p>
          ) : null}
        </>
      )}

      {editing && (
        <form onSubmit={onSave} className="mt-4 space-y-3">
          <StarPicker value={rating} onChange={setRating} disabled={update.isLoading} />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            maxLength={120}
            className={accountInputClass}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={4000}
            placeholder="Your review"
            className={accountInputClass}
          />
          <div className="flex gap-2">
            <button type="submit" disabled={update.isLoading} className="fs-btn-primary !py-2">
              {update.isLoading ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className="rounded-full px-4 py-2 text-sm font-bold text-[var(--fs-muted)] hover:bg-[var(--fs-mist)]"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </li>
  );
}

function ReviewsPanel() {
  const list = useQuery(() => reviewsApi.listMine({ page: 1, page_size: 50 }), []);

  return (
    <AccountShell
      title="Reviews"
      subtitle="Ratings you've left on fruit you've received."
      actions={
        <Link href="/shop" className="fs-btn-primary !py-2.5">
          Browse shop
        </Link>
      }
    >
      {list.isLoading && (
        <AccountCard>
          <AccountLoader label="Loading your reviews…" />
        </AccountCard>
      )}

      {list.error && (
        <AccountCard>
          <p className="text-sm font-semibold text-rose-600">{list.error.message}</p>
        </AccountCard>
      )}

      {list.data && list.data.items.length === 0 && (
        <AccountEmpty
          title="No reviews yet"
          body="After an order is delivered, you can rate products from the product page."
          href="/shop"
          cta="Find fruit to review"
        />
      )}

      {list.data && list.data.items.length > 0 && (
        <AccountCard padded={false}>
          <ul>
            {list.data.items.map((review) => (
              <MyReviewRow
                key={review.id}
                review={review}
                onChanged={() => void list.refetch()}
              />
            ))}
          </ul>
        </AccountCard>
      )}
    </AccountShell>
  );
}

export default function AccountReviewsPage() {
  return (
    <RequireAuth>
      <ReviewsPanel />
    </RequireAuth>
  );
}
