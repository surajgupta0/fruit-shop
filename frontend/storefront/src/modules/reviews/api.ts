import { api } from "@fruitshop/web-core";

export type ReviewStatus = "pending" | "approved" | "rejected" | "hidden";

export type Review = {
  id: string;
  product_id: string;
  user_id: string;
  order_id: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  status: ReviewStatus | string;
  is_verified_purchase: boolean;
  admin_note: string | null;
  author_name: string | null;
  product_name: string | null;
  product_slug: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ReviewListResponse = {
  items: Review[];
  total: number;
  page: number;
  page_size: number;
};

export type ProductRatingSummary = {
  product_id: string;
  average_rating: string | number;
  review_count: number;
  rating_breakdown: Record<string, number> | Record<number, number>;
};

export type ReviewEligibility = {
  product_id: string;
  can_review: boolean;
  reason: string | null;
  existing_review_id: string | null;
  order_id: string | null;
};

export type ReviewCreateInput = {
  product_id: string;
  rating: number;
  title?: string | null;
  body?: string | null;
};

export type ReviewUpdateInput = {
  rating?: number;
  title?: string | null;
  body?: string | null;
};

export function formatReviewDate(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function averageRatingNumber(value: string | number | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export const reviewsApi = {
  listForProduct(productId: string, params?: { page?: number; page_size?: number }) {
    return api.get<ReviewListResponse>(`/reviews/products/${productId}`, {
      auth: false,
      params,
      toastOnError: false,
    });
  },

  summary(productId: string) {
    return api.get<ProductRatingSummary>(`/reviews/products/${productId}/summary`, {
      auth: false,
      toastOnError: false,
    });
  },

  eligibility(productId: string) {
    return api.get<ReviewEligibility>(`/reviews/products/${productId}/eligibility`, {
      toastOnError: false,
    });
  },

  listMine(params?: { page?: number; page_size?: number }) {
    return api.get<ReviewListResponse>("/reviews/me", { params });
  },

  create(body: ReviewCreateInput) {
    return api.post<Review>("/reviews", body, { successToast: "Review submitted" });
  },

  update(id: string, body: ReviewUpdateInput) {
    return api.patch<Review>(`/reviews/${id}`, body, { successToast: "Review updated" });
  },

  delete(id: string) {
    return api.delete<void>(`/reviews/${id}`, { successToast: "Review removed" });
  },
};
