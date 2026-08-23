import { api } from "@fruitshop/web-core";

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  children?: Category[];
};

export type Brand = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

export type Tag = {
  id: string;
  name: string;
  slug: string;
};

export type ProductSummary = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  status: string;
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

export type ProductVariant = {
  id: string;
  sku: string;
  name: string;
  price: string | number;
  compare_at_price: string | number | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  is_default: boolean;
  is_active: boolean;
  stock_qty: number;
};

export type ProductImage = {
  id: string;
  url: string;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
};

export type ProductDetail = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  product_type: string;
  status: string;
  is_featured: boolean;
  is_organic: boolean;
  is_perishable: boolean;
  unit_label: string | null;
  badge_label: string | null;
  shelf_life_days: number | null;
  storage_instructions: string | null;
  origin_country: string | null;
  origin_region: string | null;
  allergen_info: string | null;
  nutrition_info: string | null;
  category: Category | null;
  brand: Brand | null;
  tags: Tag[];
  images: ProductImage[];
  variants: ProductVariant[];
  attributes: Array<{ id: string; name: string; value: string; is_visible: boolean }>;
};

export type ProductListResponse = {
  items: ProductSummary[];
  total: number;
  page: number;
  page_size: number;
};

export type ProductListParams = {
  page?: number;
  page_size?: number;
  category_id?: string;
  brand_id?: string;
  tag?: string;
  search?: string;
  featured?: boolean;
  organic?: boolean;
};

export function formatMoney(v: string | number | null | undefined) {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return String(v);
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function priceLabel(p: Pick<ProductSummary, "min_price" | "max_price" | "unit_label">) {
  const min = formatMoney(p.min_price);
  if (!min) return "See options";
  const max = formatMoney(p.max_price);
  const range = max && p.max_price !== p.min_price ? `${min} – ${max}` : min;
  return p.unit_label ? `${range} / ${p.unit_label}` : range;
}

export function flattenCategories(tree: Category[]): Category[] {
  const out: Category[] = [];
  for (const c of tree) {
    out.push(c);
    if (c.children?.length) out.push(...flattenCategories(c.children));
  }
  return out;
}

/** Public catalog API for the customer storefront */
export const catalogApi = {
  listProducts(params?: ProductListParams) {
    return api.get<ProductListResponse>("/catalog/products", {
      auth: false,
      params,
      toastOnError: false,
    });
  },

  getBySlug(slug: string) {
    return api.get<ProductDetail>(`/catalog/products/by-slug/${slug}`, {
      auth: false,
      toastOnError: false,
    });
  },

  listCategoryTree() {
    return api.get<Category[]>("/catalog/categories/tree", {
      auth: false,
      toastOnError: false,
    });
  },

  listCategories() {
    return api.get<Category[]>("/catalog/categories", {
      auth: false,
      toastOnError: false,
    });
  },

  listBrands() {
    return api.get<Brand[]>("/catalog/brands", { auth: false, toastOnError: false });
  },

  listTags() {
    return api.get<Tag[]>("/catalog/tags", { auth: false, toastOnError: false });
  },
};
