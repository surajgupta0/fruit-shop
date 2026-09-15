"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
  Panel,
  Select,
  TableSkeleton,
} from "@/src/console/ui";
import {
  cmsApi,
  type BlockType,
  type ContentBlock,
  type PageStatus,
} from "@/src/modules/cms/api";

function PageEditor({ pageId }: { pageId: string }) {
  const detail = useQuery(() => cmsApi.getPage(pageId), [pageId]);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [status, setStatus] = useState<PageStatus>("draft");

  const [blockType, setBlockType] = useState<BlockType>("rich_text");
  const [heading, setHeading] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [href, setHref] = useState("");
  const [hrefLabel, setHrefLabel] = useState("");

  useEffect(() => {
    if (!detail.data) return;
    setTitle(detail.data.title);
    setSlug(detail.data.slug);
    setExcerpt(detail.data.excerpt ?? "");
    setMetaTitle(detail.data.meta_title ?? "");
    setMetaDescription(detail.data.meta_description ?? "");
    setStatus(detail.data.status as PageStatus);
  }, [detail.data]);

  const save = useMutation(() =>
    cmsApi.updatePage(pageId, {
      title: title.trim(),
      slug: slug.trim(),
      excerpt: excerpt.trim() || null,
      meta_title: metaTitle.trim() || null,
      meta_description: metaDescription.trim() || null,
      status,
    }),
  );

  const addBlock = useMutation(() =>
    cmsApi.createBlock(pageId, {
      block_type: blockType,
      heading: heading.trim() || null,
      body: body.trim() || null,
      image_url: imageUrl.trim() || null,
      href: href.trim() || null,
      href_label: hrefLabel.trim() || null,
      sort_order: detail.data?.blocks.length ?? 0,
    }),
  );

  async function onSave(e: FormEvent) {
    e.preventDefault();
    try {
      await save.mutate();
      await detail.refetch();
    } catch {
      /* toast */
    }
  }

  async function onAddBlock(e: FormEvent) {
    e.preventDefault();
    try {
      await addBlock.mutate();
      setHeading("");
      setBody("");
      setImageUrl("");
      setHref("");
      setHrefLabel("");
      await detail.refetch();
    } catch {
      /* toast */
    }
  }

  async function moveBlock(block: ContentBlock, dir: -1 | 1) {
    const blocks = [...(detail.data?.blocks ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    const idx = blocks.findIndex((b) => b.id === block.id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= blocks.length) return;
    const next = [...blocks];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    try {
      await cmsApi.reorderBlocks(
        pageId,
        next.map((b, i) => ({ id: b.id, sort_order: i })),
      );
      await detail.refetch();
    } catch {
      /* toast */
    }
  }

  if (detail.isLoading) {
    return (
      <ConsolePage>
        <TableSkeleton rows={6} />
      </ConsolePage>
    );
  }

  if (detail.error || !detail.data) {
    return (
      <ConsolePage>
        <ErrorLine message={detail.error?.message ?? "Page not found"} />
        <Link href="/cms/pages" className="text-sm font-extrabold text-[var(--fs-accent)]">
          ← Back to pages
        </Link>
      </ConsolePage>
    );
  }

  const blocks = [...detail.data.blocks].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <ConsolePage>
      <PageHeader
        eyebrow="Content"
        title={detail.data.title}
        description={`Edit /pages/${detail.data.slug} on the storefront when published.`}
        actions={
          <Link href="/cms/pages">
            <Btn variant="ghost">All pages</Btn>
          </Link>
        }
      />

      <Panel title="Page settings">
        <form onSubmit={onSave} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </Field>
            <Field label="Slug">
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} required />
            </Field>
            <Field label="Status">
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as PageStatus)}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </Select>
            </Field>
            <Field label="Excerpt">
              <Input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
            </Field>
            <Field label="Meta title">
              <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} />
            </Field>
            <Field label="Meta description">
              <Input
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
              />
            </Field>
          </div>
          <Btn type="submit" disabled={save.isLoading}>
            {save.isLoading ? "Saving…" : "Save page"}
          </Btn>
        </form>
      </Panel>

      <Panel title="Content blocks" description="Ordered sections shown on the public page.">
        {blocks.length === 0 && (
          <EmptyState title="No blocks yet" body="Add a rich text, image, or CTA block below." />
        )}
        <ul className="space-y-3">
          {blocks.map((block, i) => (
            <li
              key={block.id}
              className="rounded-xl border border-[var(--fs-line)] bg-[var(--fs-canvas)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--fs-muted)]">
                    {String(block.block_type).replaceAll("_", " ")} · #{i + 1}
                    {!block.is_visible ? " · hidden" : ""}
                  </p>
                  {block.heading ? (
                    <p className="mt-1 font-extrabold text-[var(--fs-ink)]">{block.heading}</p>
                  ) : null}
                  {block.body ? (
                    <p className="mt-1 line-clamp-3 text-sm font-medium text-[var(--fs-muted)]">
                      {block.body}
                    </p>
                  ) : null}
                  {block.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={block.image_url}
                      alt={block.image_alt ?? ""}
                      className="mt-2 h-24 rounded-lg object-cover"
                    />
                  ) : null}
                  {block.href ? (
                    <p className="mt-1 text-xs font-bold text-[var(--fs-accent-deep)]">
                      {block.href_label || "Link"} → {block.href}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <button
                    type="button"
                    className="text-xs font-extrabold text-[var(--fs-muted)] hover:underline"
                    onClick={() => void moveBlock(block, -1)}
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    className="text-xs font-extrabold text-[var(--fs-muted)] hover:underline"
                    onClick={() => void moveBlock(block, 1)}
                  >
                    Move down
                  </button>
                  <button
                    type="button"
                    className="text-xs font-extrabold text-[var(--fs-accent-deep)] hover:underline"
                    onClick={async () => {
                      try {
                        await cmsApi.updateBlock(block.id, {
                          is_visible: !block.is_visible,
                        });
                        await detail.refetch();
                      } catch {
                        /* toast */
                      }
                    }}
                  >
                    {block.is_visible ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    className="text-xs font-extrabold text-[var(--fs-danger)] hover:underline"
                    onClick={async () => {
                      if (!confirm("Delete this block?")) return;
                      try {
                        await cmsApi.deleteBlock(block.id);
                        await detail.refetch();
                      } catch {
                        /* toast */
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <form
          onSubmit={onAddBlock}
          className="mt-6 space-y-3 border-t border-[var(--fs-line)] pt-5"
        >
          <p className="text-sm font-extrabold text-[var(--fs-ink)]">Add block</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Type">
              <Select
                value={blockType}
                onChange={(e) => setBlockType(e.target.value as BlockType)}
              >
                <option value="rich_text">Rich text</option>
                <option value="image">Image</option>
                <option value="cta">CTA</option>
                <option value="html">HTML</option>
              </Select>
            </Field>
            <Field label="Heading">
              <Input value={heading} onChange={(e) => setHeading(e.target.value)} />
            </Field>
            <Field label="Body">
              <Input value={body} onChange={(e) => setBody(e.target.value)} />
            </Field>
            <Field label="Image URL">
              <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            </Field>
            <Field label="Link href">
              <Input value={href} onChange={(e) => setHref(e.target.value)} />
            </Field>
            <Field label="Link label">
              <Input value={hrefLabel} onChange={(e) => setHrefLabel(e.target.value)} />
            </Field>
          </div>
          <Btn type="submit" disabled={addBlock.isLoading}>
            {addBlock.isLoading ? "Adding…" : "Add block"}
          </Btn>
        </form>
      </Panel>
    </ConsolePage>
  );
}

export default function CmsPageDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  if (!id) return null;
  return (
    <RequirePermission permission={P.CMS_MANAGE}>
      <PageEditor pageId={id} />
    </RequirePermission>
  );
}
