"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery } from "@fruitshop/web-core";

import { RequirePermission } from "@/src/components/RequirePermission";
import { P } from "@/src/console/permissions";
import {
  Btn,
  ConsolePage,
  EmptyState,
  ErrorLine,
  Field,
  Input,
  PageHeader,
  Pagination,
  Panel,
  Select,
  StatusPill,
  Surface,
  TableHead,
  TableSkeleton,
  Toolbar,
} from "@/src/console/ui";
import { cmsApi, type BannerInput } from "@/src/modules/cms/api";

const emptyForm: BannerInput = {
  placement: "home_hero",
  label: "",
  title: "",
  description: "",
  image_url: "",
  image_alt: "",
  primary_href: "/shop",
  primary_label: "Shop now",
  secondary_href: "",
  secondary_label: "",
  sort_order: 0,
  is_active: true,
};

function BannersPanel() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [placement, setPlacement] = useState("");
  const [form, setForm] = useState<BannerInput>(emptyForm);

  const params = useMemo(
    () => ({
      page,
      page_size: 20,
      search: search.trim() || undefined,
      placement: placement || undefined,
    }),
    [page, search, placement],
  );
  const list = useQuery(() => cmsApi.listBanners(params), [params]);
  const create = useMutation(() =>
    cmsApi.createBanner({
      ...form,
      label: form.label?.trim() || null,
      description: form.description?.trim() || null,
      image_alt: form.image_alt?.trim() || null,
      secondary_href: form.secondary_href?.trim() || null,
      secondary_label: form.secondary_label?.trim() || null,
    }),
  );

  const totalPages = list.data
    ? Math.max(1, Math.ceil(list.data.total / list.data.page_size))
    : 1;

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    try {
      await create.mutate();
      setForm(emptyForm);
      await list.refetch();
    } catch {
      /* toast */
    }
  }

  return (
    <ConsolePage width="wide">
      <PageHeader
        eyebrow="Content"
        title="Banners"
        description="Hero slides and promo banners for the storefront."
      />

      <Panel title="New banner" description="Use placement home_hero for the homepage carousel.">
        <form onSubmit={onCreate} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Placement">
              <Input
                value={form.placement ?? "home_hero"}
                onChange={(e) => setForm((f) => ({ ...f, placement: e.target.value }))}
                placeholder="home_hero"
                required
              />
            </Field>
            <Field label="Label">
              <Input
                value={form.label ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="In season"
              />
            </Field>
            <Field label="Sort order">
              <Input
                type="number"
                value={form.sort_order ?? 0}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sort_order: Number(e.target.value) || 0 }))
                }
              />
            </Field>
            <Field label="Title">
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </Field>
            <Field label="Image URL">
              <Input
                value={form.image_url}
                onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                placeholder="https://…"
                required
              />
            </Field>
            <Field label="Image alt">
              <Input
                value={form.image_alt ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, image_alt: e.target.value }))}
              />
            </Field>
            <Field label="Description">
              <Input
                value={form.description ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </Field>
            <Field label="Primary link">
              <Input
                value={form.primary_href ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, primary_href: e.target.value }))}
                placeholder="/shop"
              />
            </Field>
            <Field label="Primary label">
              <Input
                value={form.primary_label ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, primary_label: e.target.value }))}
              />
            </Field>
            <Field label="Secondary link">
              <Input
                value={form.secondary_href ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, secondary_href: e.target.value }))}
              />
            </Field>
            <Field label="Secondary label">
              <Input
                value={form.secondary_label ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, secondary_label: e.target.value }))}
              />
            </Field>
            <Field label="Active">
              <Select
                value={form.is_active ? "1" : "0"}
                onChange={(e) =>
                  setForm((f) => ({ ...f, is_active: e.target.value === "1" }))
                }
              >
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </Select>
            </Field>
          </div>
          <Btn type="submit" disabled={create.isLoading || !form.title.trim() || !form.image_url.trim()}>
            {create.isLoading ? "Creating…" : "Create banner"}
          </Btn>
        </form>
      </Panel>

      <Toolbar>
        <Input
          type="search"
          placeholder="Search title or label…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="sm:min-w-[220px] sm:flex-1"
        />
        <Select
          value={placement}
          onChange={(e) => {
            setPlacement(e.target.value);
            setPage(1);
          }}
          className="sm:w-44"
        >
          <option value="">All placements</option>
          <option value="home_hero">home_hero</option>
        </Select>
      </Toolbar>

      <Surface>
        {list.isLoading && <TableSkeleton rows={6} />}
        {list.error && <ErrorLine message={list.error.message} />}
        {list.data && list.data.items.length === 0 && (
          <EmptyState title="No banners" body="Create a hero banner above." />
        )}
        {list.data && list.data.items.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <TableHead>
                  <tr>
                    <th className="px-4 py-3 sm:px-5">Banner</th>
                    <th className="px-4 py-3">Placement</th>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </TableHead>
                <tbody className="divide-y divide-[var(--fs-line)]">
                  {list.data.items.map((b) => (
                    <tr key={b.id} className="transition hover:bg-[var(--fs-mist)]/50">
                      <td className="px-4 py-3.5 sm:px-5">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={b.image_url}
                            alt=""
                            className="size-12 rounded-lg object-cover ring-1 ring-[var(--fs-line)]"
                          />
                          <div>
                            <p className="font-extrabold">{b.title}</p>
                            <p className="text-xs font-medium text-[var(--fs-muted)]">
                              {b.label || "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs">{b.placement}</td>
                      <td className="px-4 py-3.5 tabular-nums">{b.sort_order}</td>
                      <td className="px-4 py-3.5">
                        <StatusPill tone={b.is_active ? "ok" : "neutral"}>
                          {b.is_active ? "Active" : "Off"}
                        </StatusPill>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          className="mr-3 text-xs font-extrabold text-[var(--fs-accent-deep)] hover:underline"
                          onClick={async () => {
                            try {
                              await cmsApi.updateBanner(b.id, { is_active: !b.is_active });
                              await list.refetch();
                            } catch {
                              /* toast */
                            }
                          }}
                        >
                          {b.is_active ? "Disable" : "Enable"}
                        </button>
                        <button
                          type="button"
                          className="text-xs font-extrabold text-[var(--fs-danger)] hover:underline"
                          onClick={async () => {
                            if (!confirm(`Delete “${b.title}”?`)) return;
                            try {
                              await cmsApi.deleteBanner(b.id);
                              await list.refetch();
                            } catch {
                              /* toast */
                            }
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={list.data.page}
              totalPages={totalPages}
              total={list.data.total}
              onPrev={() => setPage((p) => p - 1)}
              onNext={() => setPage((p) => p + 1)}
            />
          </>
        )}
      </Surface>
    </ConsolePage>
  );
}

export default function CmsBannersPage() {
  return (
    <RequirePermission permission={P.CMS_MANAGE}>
      <BannersPanel />
    </RequirePermission>
  );
}
