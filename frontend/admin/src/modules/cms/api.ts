import { api } from "@fruitshop/web-core";

export type PageStatus = "draft" | "published" | "archived";
export type BlockType =
  | "rich_text"
  | "image"
  | "cta"
  | "html"
  | "product_rail"
  | "banner_ref";

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
  starts_at: string | null;
  ends_at: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BannerListResponse = {
  items: CmsBanner[];
  total: number;
  page: number;
  page_size: number;
};

export type BannerInput = {
  placement?: string;
  label?: string | null;
  title: string;
  description?: string | null;
  image_url: string;
  image_alt?: string | null;
  primary_href?: string | null;
  primary_label?: string | null;
  secondary_href?: string | null;
  secondary_label?: string | null;
  sort_order?: number;
  is_active?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
};

export type ContentBlock = {
  id: string;
  page_id: string;
  block_type: BlockType | string;
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

export type ContentBlockInput = {
  block_type?: BlockType;
  sort_order?: number;
  is_visible?: boolean;
  heading?: string | null;
  body?: string | null;
  image_url?: string | null;
  image_alt?: string | null;
  href?: string | null;
  href_label?: string | null;
  ref_id?: string | null;
  ref_key?: string | null;
};

export type CmsPageSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  status: PageStatus | string;
  published_at: string | null;
  sort_order: number;
  block_count: number;
};

export type CmsPageDetail = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  meta_title: string | null;
  meta_description: string | null;
  status: PageStatus | string;
  published_at: string | null;
  sort_order: number;
  blocks: ContentBlock[];
};

export type PageListResponse = {
  items: CmsPageSummary[];
  total: number;
  page: number;
  page_size: number;
};

export type PageInput = {
  slug?: string | null;
  title: string;
  excerpt?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  status?: PageStatus;
  published_at?: string | null;
  sort_order?: number;
  blocks?: ContentBlockInput[];
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

export type SnippetListResponse = {
  items: CmsSnippet[];
  total: number;
  page: number;
  page_size: number;
};

export type SnippetInput = {
  key: string;
  title: string;
  body?: string | null;
  href?: string | null;
  href_label?: string | null;
  is_active?: boolean;
};

export const cmsApi = {
  listBanners(params?: {
    page?: number;
    page_size?: number;
    placement?: string;
    active_only?: boolean;
    search?: string;
  }) {
    return api.get<BannerListResponse>("/cms/admin/banners", { params });
  },

  createBanner(body: BannerInput) {
    return api.post<CmsBanner>("/cms/admin/banners", body, {
      successToast: "Banner created",
    });
  },

  updateBanner(id: string, body: Partial<BannerInput>) {
    return api.patch<CmsBanner>(`/cms/admin/banners/${id}`, body, {
      successToast: "Banner updated",
    });
  },

  deleteBanner(id: string) {
    return api.delete<void>(`/cms/admin/banners/${id}`, {
      successToast: "Banner deleted",
    });
  },

  listPages(params?: {
    page?: number;
    page_size?: number;
    status?: PageStatus | "";
    search?: string;
  }) {
    return api.get<PageListResponse>("/cms/admin/pages", {
      params: {
        page: params?.page,
        page_size: params?.page_size,
        status: params?.status || undefined,
        search: params?.search || undefined,
      },
    });
  },

  getPage(id: string) {
    return api.get<CmsPageDetail>(`/cms/admin/pages/${id}`);
  },

  createPage(body: PageInput) {
    return api.post<CmsPageDetail>("/cms/admin/pages", body, {
      successToast: "Page created",
    });
  },

  updatePage(id: string, body: Partial<PageInput>) {
    return api.patch<CmsPageDetail>(`/cms/admin/pages/${id}`, body, {
      successToast: "Page updated",
    });
  },

  deletePage(id: string) {
    return api.delete<void>(`/cms/admin/pages/${id}`, {
      successToast: "Page deleted",
    });
  },

  createBlock(pageId: string, body: ContentBlockInput) {
    return api.post<ContentBlock>(`/cms/admin/pages/${pageId}/blocks`, body, {
      successToast: "Block added",
    });
  },

  updateBlock(blockId: string, body: Partial<ContentBlockInput>) {
    return api.patch<ContentBlock>(`/cms/admin/blocks/${blockId}`, body, {
      successToast: "Block updated",
    });
  },

  deleteBlock(blockId: string) {
    return api.delete<void>(`/cms/admin/blocks/${blockId}`, {
      successToast: "Block deleted",
    });
  },

  reorderBlocks(pageId: string, blocks: { id: string; sort_order: number }[]) {
    return api.put<CmsPageDetail>(`/cms/admin/pages/${pageId}/blocks/reorder`, {
      blocks,
    });
  },

  listSnippets(params?: {
    page?: number;
    page_size?: number;
    active_only?: boolean;
    search?: string;
  }) {
    return api.get<SnippetListResponse>("/cms/admin/snippets", { params });
  },

  createSnippet(body: SnippetInput) {
    return api.post<CmsSnippet>("/cms/admin/snippets", body, {
      successToast: "Snippet created",
    });
  },

  updateSnippet(id: string, body: Partial<Omit<SnippetInput, "key">>) {
    return api.patch<CmsSnippet>(`/cms/admin/snippets/${id}`, body, {
      successToast: "Snippet updated",
    });
  },

  deleteSnippet(id: string) {
    return api.delete<void>(`/cms/admin/snippets/${id}`, {
      successToast: "Snippet deleted",
    });
  },
};
