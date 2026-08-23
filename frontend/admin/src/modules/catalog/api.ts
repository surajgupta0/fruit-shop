import { api } from "@fruitshop/web-core";

export type ProductStatus = "draft" | "active" | "archived";
export type ProductType = "simple" | "variable" | "bundle";
export type ProductVisibility = "visible" | "catalog" | "search" | "hidden";

export type Brand = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  is_active: boolean;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
};

export type Tag = {
  id: string;
  name: string;
  slug: string;
};

export type ProductVariant = {
  id: string;
  sku: string;
  name: string;
  price: string | number;
  compare_at_price: string | number | null;
  cost_price: string | number | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  is_default: boolean;
  is_active: boolean;
  stock_qty: number;
  low_stock_threshold: number;
  inventory_policy: string;
};

export type ProductImage = {
  id: string;
  url: string;
  alt_text: string | null;
  media_type: string;
  sort_order: number;
  is_primary: boolean;
};

export type ProductAttribute = {
  id: string;
  name: string;
  value: string;
  sort_order: number;
  is_visible: boolean;
};

export type ProductSummary = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  status: ProductStatus | string;
  visibility: string;
  product_type: string;
  is_featured: boolean;
  is_organic: boolean;
  badge_label: string | null;
  unit_label: string | null;
  category_id: string | null;
  category_name: string | null;
  brand_id: string | null;
  brand_name: string | null;
  primary_image_url: string | null;
  min_price: string | number | null;
  max_price: string | number | null;
  tag_slugs: string[];
};

export type ProductDetail = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  product_type: string;
  status: string;
  visibility: string;
  is_featured: boolean;
  is_organic: boolean;
  is_perishable: boolean;
  is_taxable: boolean;
  requires_shipping: boolean;
  track_inventory: boolean;
  vendor: string | null;
  unit_label: string | null;
  hsn_code: string | null;
  tax_percent: string | number | null;
  badge_label: string | null;
  min_order_qty: number;
  max_order_qty: number | null;
  order_qty_increment: number;
  shelf_life_days: number | null;
  storage_instructions: string | null;
  origin_country: string | null;
  origin_region: string | null;
  allergen_info: string | null;
  nutrition_info: string | null;
  search_keywords: string | null;
  meta_title: string | null;
  meta_description: string | null;
  sort_order: number;
  category_id: string | null;
  brand_id: string | null;
  category: Category | null;
  brand: Brand | null;
  tags: Tag[];
  attributes: ProductAttribute[];
  images: ProductImage[];
  variants: ProductVariant[];
};

export type ProductListResponse = {
  items: ProductSummary[];
  total: number;
  page: number;
  page_size: number;
};

export type CreateProductInput = {
  name: string;
  slug?: string;
  short_description?: string;
  description?: string;
  category_id?: string | null;
  brand_id?: string | null;
  product_type?: ProductType;
  status?: ProductStatus;
  visibility?: ProductVisibility;
  is_featured?: boolean;
  is_organic?: boolean;
  is_perishable?: boolean;
  track_inventory?: boolean;
  unit_label?: string;
  badge_label?: string;
  tag_ids?: string[];
  variants?: Array<{
    sku: string;
    name: string;
    price: number;
    stock_qty?: number;
    low_stock_threshold?: number;
    is_default?: boolean;
    is_active?: boolean;
  }>;
  images?: Array<{
    url: string;
    alt_text?: string;
    is_primary?: boolean;
  }>;
};

function money(v: string | number | null | undefined) {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return String(v);
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export const formatPrice = money;

/** Catalog admin API */
export const catalogApi = {
  listProducts(params?: {
    page?: number;
    page_size?: number;
    status?: string;
    category_id?: string;
    brand_id?: string;
    tag?: string;
    search?: string;
    featured?: boolean;
    organic?: boolean;
  }) {
    return api.get<ProductListResponse>("/catalog/admin/products", { params });
  },

  getProduct(id: string) {
    return api.get<ProductDetail>(`/catalog/admin/products/${id}`);
  },

  createProduct(body: CreateProductInput) {
    return api.post<ProductDetail>("/catalog/admin/products", body, {
      successToast: "Product created",
    });
  },

  updateProduct(id: string, body: Record<string, unknown>) {
    return api.patch<ProductDetail>(`/catalog/admin/products/${id}`, body, {
      successToast: "Product updated",
    });
  },

  deleteProduct(id: string) {
    return api.delete<void>(`/catalog/admin/products/${id}`, {
      successToast: "Product deleted",
    });
  },

  // Categories
  listCategories() {
    return api.get<Category[]>("/catalog/admin/categories");
  },
  createCategory(body: {
    name: string;
    slug?: string;
    description?: string;
    image_url?: string;
    parent_id?: string | null;
    sort_order?: number;
    is_active?: boolean;
  }) {
    return api.post<Category>("/catalog/admin/categories", body, {
      successToast: "Category created",
    });
  },
  updateCategory(id: string, body: Record<string, unknown>) {
    return api.patch<Category>(`/catalog/admin/categories/${id}`, body, {
      successToast: "Category updated",
    });
  },
  deleteCategory(id: string) {
    return api.delete<void>(`/catalog/admin/categories/${id}`, {
      successToast: "Category deleted",
    });
  },

  // Brands
  listBrands() {
    return api.get<Brand[]>("/catalog/admin/brands");
  },
  createBrand(body: {
    name: string;
    slug?: string;
    description?: string;
    is_active?: boolean;
  }) {
    return api.post<Brand>("/catalog/admin/brands", body, {
      successToast: "Brand created",
    });
  },
  updateBrand(id: string, body: Record<string, unknown>) {
    return api.patch<Brand>(`/catalog/admin/brands/${id}`, body, {
      successToast: "Brand updated",
    });
  },
  deleteBrand(id: string) {
    return api.delete<void>(`/catalog/admin/brands/${id}`, {
      successToast: "Brand deleted",
    });
  },

  // Tags
  listTags() {
    return api.get<Tag[]>("/catalog/tags", { auth: true });
  },
  createTag(body: { name: string; slug?: string }) {
    return api.post<Tag>("/catalog/admin/tags", body, { successToast: "Tag created" });
  },
  updateTag(id: string, body: Record<string, unknown>) {
    return api.patch<Tag>(`/catalog/admin/tags/${id}`, body, {
      successToast: "Tag updated",
    });
  },
  deleteTag(id: string) {
    return api.delete<void>(`/catalog/admin/tags/${id}`, { successToast: "Tag deleted" });
  },

  // Variants / images
  addVariant(
    productId: string,
    body: {
      sku: string;
      name: string;
      price: number;
      stock_qty?: number;
      low_stock_threshold?: number;
      is_default?: boolean;
      is_active?: boolean;
    },
  ) {
    return api.post<ProductVariant>(`/catalog/admin/products/${productId}/variants`, body, {
      successToast: "Variant added",
    });
  },
  updateVariant(productId: string, variantId: string, body: Record<string, unknown>) {
    return api.patch<ProductVariant>(
      `/catalog/admin/products/${productId}/variants/${variantId}`,
      body,
      { successToast: "Variant updated" },
    );
  },
  deleteVariant(productId: string, variantId: string) {
    return api.delete<void>(`/catalog/admin/products/${productId}/variants/${variantId}`, {
      successToast: "Variant removed",
    });
  },
  addImage(
    productId: string,
    body: { url: string; alt_text?: string; is_primary?: boolean; sort_order?: number },
  ) {
    return api.post<ProductImage>(`/catalog/admin/products/${productId}/images`, body, {
      successToast: "Image added",
    });
  },
  updateImage(productId: string, imageId: string, body: Record<string, unknown>) {
    return api.patch<ProductImage>(
      `/catalog/admin/products/${productId}/images/${imageId}`,
      body,
      { successToast: "Image updated" },
    );
  },
  deleteImage(productId: string, imageId: string) {
    return api.delete<void>(`/catalog/admin/products/${productId}/images/${imageId}`, {
      successToast: "Image removed",
    });
  },
};
