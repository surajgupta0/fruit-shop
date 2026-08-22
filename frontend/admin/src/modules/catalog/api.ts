import { api } from "@fruitshop/web-core";

export type ProductListResponse = {
  items: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    is_featured: boolean;
    primary_image_url: string | null;
    min_price: string | null;
    max_price: string | null;
  }>;
  total: number;
  page: number;
  page_size: number;
};

export type ProductDetail = Record<string, unknown> & {
  id: string;
  name: string;
  slug: string;
  status: string;
};

/** Catalog module API — all calls go through shared `api` */
export const catalogApi = {
  listProducts(params?: {
    page?: number;
    page_size?: number;
    status?: string;
    search?: string;
    featured?: boolean;
  }) {
    return api.get<ProductListResponse>("/catalog/admin/products", { params });
  },

  getProduct(id: string) {
    return api.get<ProductDetail>(`/catalog/admin/products/${id}`);
  },

  createProduct(body: unknown) {
    return api.post<ProductDetail>("/catalog/admin/products", body, {
      successToast: "Product created",
    });
  },

  updateProduct(id: string, body: unknown) {
    return api.patch<ProductDetail>(`/catalog/admin/products/${id}`, body, {
      successToast: "Product updated",
    });
  },

  deleteProduct(id: string) {
    return api.delete<void>(`/catalog/admin/products/${id}`, {
      successToast: "Product deleted",
    });
  },

  listCategories() {
    return api.get<Array<{ id: string; name: string; slug: string }>>("/catalog/admin/categories");
  },

  listBrands() {
    return api.get<Array<{ id: string; name: string; slug: string }>>("/catalog/admin/brands");
  },

  listTags() {
    return api.get<Array<{ id: string; name: string; slug: string }>>("/catalog/tags", {
      auth: false,
    });
  },
};
