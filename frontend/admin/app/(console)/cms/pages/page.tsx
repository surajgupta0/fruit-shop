"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { cmsApi, type PageStatus } from "@/src/modules/cms/api";

function statusTone(status: string) {
  if (status === "published") return "ok" as const;
  if (status === "archived") return "neutral" as const;
  return "warn" as const;
}

function PagesPanel() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PageStatus | "">("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");

  const params = useMemo(
    () => ({
      page,
      page_size: 20,
      search: search.trim() || undefined,
      status,
    }),
    [page, search, status],
  );
  const list = useQuery(() => cmsApi.listPages(params), [params]);
  const create = useMutation(() =>
    cmsApi.createPage({
      title: title.trim(),
      slug: slug.trim() || undefined,
      status: "draft",
    }),
  );

  const totalPages = list.data
    ? Math.max(1, Math.ceil(list.data.total / list.data.page_size))
    : 1;

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    try {
      const created = await create.mutate();
      setTitle("");
      setSlug("");
      router.push(`/cms/pages/${created.id}`);
    } catch {
      /* toast */
    }
  }

  return (
    <ConsolePage>
      <PageHeader
        eyebrow="Content"
        title="Pages"
        description="About, shipping, FAQ and other storefront content pages."
      />

      <Panel title="New page">
        <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Title">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="About us"
              required
            />
          </Field>
          <Field label="Slug (optional)">
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="about"
            />
          </Field>
          <Btn type="submit" disabled={create.isLoading || !title.trim()}>
            {create.isLoading ? "Creating…" : "Create"}
          </Btn>
        </form>
      </Panel>

      <Toolbar>
        <Input
          type="search"
          placeholder="Search title or slug…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="sm:min-w-[220px] sm:flex-1"
        />
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as PageStatus | "");
            setPage(1);
          }}
          className="sm:w-40"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </Select>
      </Toolbar>

      <Surface>
        {list.isLoading && <TableSkeleton rows={6} />}
        {list.error && <ErrorLine message={list.error.message} />}
        {list.data && list.data.items.length === 0 && (
          <EmptyState title="No pages" body="Create a page to start editing content blocks." />
        )}
        {list.data && list.data.items.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <TableHead>
                  <tr>
                    <th className="px-4 py-3 sm:px-5">Page</th>
                    <th className="px-4 py-3">Blocks</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </TableHead>
                <tbody className="divide-y divide-[var(--fs-line)]">
                  {list.data.items.map((p) => (
                    <tr key={p.id} className="transition hover:bg-[var(--fs-mist)]/50">
                      <td className="px-4 py-3.5 sm:px-5">
                        <Link
                          href={`/cms/pages/${p.id}`}
                          className="font-extrabold text-[var(--fs-ink)] hover:text-[var(--fs-accent-deep)]"
                        >
                          {p.title}
                        </Link>
                        <p className="font-mono text-xs text-[var(--fs-muted)]">/{p.slug}</p>
                      </td>
                      <td className="px-4 py-3.5 tabular-nums font-semibold">{p.block_count}</td>
                      <td className="px-4 py-3.5">
                        <StatusPill tone={statusTone(String(p.status))}>{p.status}</StatusPill>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/cms/pages/${p.id}`}
                          className="mr-3 text-xs font-extrabold text-[var(--fs-accent-deep)] hover:underline"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="text-xs font-extrabold text-[var(--fs-danger)] hover:underline"
                          onClick={async () => {
                            if (!confirm(`Delete “${p.title}”?`)) return;
                            try {
                              await cmsApi.deletePage(p.id);
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

export default function CmsPagesPage() {
  return (
    <RequirePermission permission={P.CMS_MANAGE}>
      <PagesPanel />
    </RequirePermission>
  );
}
