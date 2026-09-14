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

export type ReviewModerateInput = {
  status: ReviewStatus;
  admin_note?: string | null;
};

export function reviewStatusTone(status: string) {
  if (status === "approved") return "ok" as const;
  if (status === "rejected" || status === "hidden") return "danger" as const;
  if (status === "pending") return "warn" as const;
  return "neutral" as const;
}

export const reviewsApi = {
  list(params?: {
    page?: number;
    page_size?: number;
    status?: ReviewStatus | "";
    product_id?: string;
    search?: string;
  }) {
    return api.get<ReviewListResponse>("/reviews/admin", {
      params: {
        page: params?.page,
        page_size: params?.page_size,
        status: params?.status || undefined,
        product_id: params?.product_id || undefined,
        search: params?.search || undefined,
      },
    });
  },

  get(id: string) {
    return api.get<Review>(`/reviews/admin/${id}`);
  },

  moderate(id: string, body: ReviewModerateInput) {
    return api.patch<Review>(`/reviews/admin/${id}`, body, {
      successToast: "Review updated",
    });
  },

  delete(id: string) {
    return api.delete<void>(`/reviews/admin/${id}`, { successToast: "Review deleted" });
  },
};
