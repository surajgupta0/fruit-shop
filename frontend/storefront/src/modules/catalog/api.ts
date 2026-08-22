import { api } from "@fruitshop/web-core";

/** Public catalog — storefront modules call this, never raw fetch */
export const catalogApi = {
  listProducts(params?: {
    page?: number;
    page_size?: number;
    category_id?: string;
    tag?: string;
    search?: string;
    featured?: boolean;
  }) {
    return api.get<{
      items: Array<{
        id: string;
        name: string;
        slug: string;
        primary_image_url: string | null;
        min_price: string | null;
        max_price: string | null;
      }>;
      total: number;
    }>("/catalog/products", { auth: false, params, toastOnError: false });
  },

  getBySlug(slug: string) {
    return api.get(`/catalog/products/by-slug/${slug}`, { auth: false });
  },

  listCategories() {
    return api.get("/catalog/categories/tree", { auth: false });
  },
};
