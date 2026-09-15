import { api } from "@fruitshop/web-core";

export type CmsBanner = {
  id: string;
  placement: string;
  label: string | null;
  title: string;
  description: string | null;
  image_url: string;
  image_alt: string | null;
  primary_href: string | null;
  primary_label: string | null;
  secondary_href: string | null;
  secondary_label: string | null;
  sort_order: number;
  is_active: boolean;
};

export type ContentBlock = {
  id: string;
  page_id: string;
  block_type: string;
  sort_order: number;
  is_visible: boolean;
  heading: string | null;
  body: string | null;
  image_url: string | null;
  image_alt: string | null;
  href: string | null;
  href_label: string | null;
  ref_id: string | null;
  ref_key: string | null;
};

export type CmsPage = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  meta_title: string | null;
  meta_description: string | null;
  status: string;
  published_at: string | null;
  sort_order: number;
  blocks: ContentBlock[];
};

export type CmsSnippet = {
  id: string;
  key: string;
  title: string;
  body: string | null;
  href: string | null;
  href_label: string | null;
  is_active: boolean;
};

export const cmsApi = {
  listBanners(placement = "home_hero") {
    return api.get<CmsBanner[]>("/cms/banners", {
      auth: false,
      params: { placement },
      toastOnError: false,
    });
  },

  getPageBySlug(slug: string) {
    return api.get<CmsPage>(`/cms/pages/by-slug/${slug}`, {
      auth: false,
      toastOnError: false,
    });
  },

  listSnippets(keys?: string[]) {
    return api.get<CmsSnippet[]>("/cms/snippets", {
      auth: false,
      params: keys?.length ? { keys: keys.join(",") } : undefined,
      toastOnError: false,
    });
  },

  getSnippet(key: string) {
    return api.get<CmsSnippet>(`/cms/snippets/by-key/${key}`, {
      auth: false,
      toastOnError: false,
    });
  },
};
