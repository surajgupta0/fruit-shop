"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@fruitshop/web-core";

import { StoreShell } from "@/src/components/StoreChrome";
import { cmsApi, type ContentBlock } from "@/src/modules/cms/api";

function BlockView({ block }: { block: ContentBlock }) {
  if (!block.is_visible) return null;

  if (block.block_type === "image" && block.image_url) {
    return (
      <figure className="overflow-hidden rounded-2xl border border-[var(--fs-line)] bg-white shadow-[var(--fs-shadow-sm)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={block.image_url}
          alt={block.image_alt ?? block.heading ?? ""}
          className="w-full object-cover"
        />
        {block.heading || block.body ? (
          <figcaption className="px-5 py-4">
            {block.heading ? (
              <p className="font-extrabold text-[var(--fs-ink)]">{block.heading}</p>
            ) : null}
            {block.body ? (
              <p className="mt-1 text-sm font-medium text-[var(--fs-muted)]">{block.body}</p>
            ) : null}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  if (block.block_type === "cta") {
    return (
      <div className="rounded-2xl border border-[var(--fs-line)] bg-[var(--fs-mist)]/60 px-6 py-8 text-center shadow-[var(--fs-shadow-sm)]">
        {block.heading ? (
          <h2 className="fs-section-title text-2xl">{block.heading}</h2>
        ) : null}
        {block.body ? (
          <p className="mx-auto mt-2 max-w-lg text-sm font-medium text-[var(--fs-muted)]">
            {block.body}
          </p>
        ) : null}
        {block.href ? (
          <Link href={block.href} className="fs-btn-primary mt-6 inline-flex">
            {block.href_label || "Learn more"}
          </Link>
        ) : null}
      </div>
    );
  }

  if (block.block_type === "html" && block.body) {
    return (
      <div
        className="prose prose-sm max-w-none text-[var(--fs-ink)]"
        dangerouslySetInnerHTML={{ __html: block.body }}
      />
    );
  }

  return (
    <div>
      {block.heading ? (
        <h2 className="fs-section-title text-2xl">{block.heading}</h2>
      ) : null}
      {block.body ? (
        <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-relaxed text-[var(--fs-muted)]">
          {block.body}
        </p>
      ) : null}
      {block.href ? (
        <Link
          href={block.href}
          className="mt-4 inline-block text-sm font-extrabold text-[var(--fs-accent)] hover:underline"
        >
          {block.href_label || "Read more"} →
        </Link>
      ) : null}
    </div>
  );
}

function CmsPageView({ slug }: { slug: string }) {
  const page = useQuery(() => cmsApi.getPageBySlug(slug), [slug]);

  if (page.isLoading) {
    return (
      <StoreShell>
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6" role="status" aria-label="Loading">
          <div className="fs-skeleton h-4 w-24" />
          <div className="fs-skeleton mt-4 h-10 w-2/3" />
          <div className="fs-skeleton mt-6 h-4 w-full" />
          <div className="fs-skeleton mt-2 h-4 w-5/6" />
          <div className="fs-skeleton mt-8 h-40 w-full !rounded-2xl" />
        </div>
      </StoreShell>
    );
  }

  if (page.error || !page.data) {
    return (
      <StoreShell>
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <p className="fs-eyebrow">Pages</p>
          <h1 className="fs-section-title mt-2 text-3xl">Page not found</h1>
          <p className="mt-3 text-sm font-medium text-[var(--fs-muted)]">
            This page is unpublished or does not exist.
          </p>
          <Link href="/" className="fs-btn-primary mt-8 inline-flex">
            Back home
          </Link>
        </div>
      </StoreShell>
    );
  }

  const p = page.data;
  const blocks = [...p.blocks].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <StoreShell>
      <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <nav className="text-sm font-semibold text-[var(--fs-muted)]">
          <Link href="/" className="hover:text-[var(--fs-accent)]">
            Home
          </Link>
          <span className="mx-2 text-[var(--fs-line)]">/</span>
          <span className="text-[var(--fs-ink)]">{p.title}</span>
        </nav>
        <h1 className="fs-section-title mt-4 text-3xl sm:text-4xl">{p.title}</h1>
        {p.excerpt ? (
          <p className="mt-3 text-base font-medium text-[var(--fs-muted)]">{p.excerpt}</p>
        ) : null}

        <div className="mt-10 space-y-10">
          {blocks.map((block) => (
            <BlockView key={block.id} block={block} />
          ))}
        </div>
      </article>
    </StoreShell>
  );
}

export default function StoreCmsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  if (!slug) return null;
  return <CmsPageView slug={slug} />;
}
