"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@fruitshop/web-core";

import { cmsApi, type CmsBanner } from "@/src/modules/cms/api";

export type HeroSlide = {
  id: string;
  image: string;
  label: string;
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

/** Fallback when CMS has no active home_hero banners */
const FALLBACK_SLIDES: HeroSlide[] = [
  {
    id: "seasonal",
    image:
      "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=2000&q=80",
    label: "In season now",
    title: "Fresh fruit that tastes like sunshine",
    description:
      "Hand-picked seasonal favourites, packed after you order — farm-to-door care for every box.",
    primaryHref: "/shop?featured=1",
    primaryLabel: "Shop seasonal",
    secondaryHref: "/shop?featured=1",
    secondaryLabel: "View bestsellers",
  },
  {
    id: "everyday",
    image:
      "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=2000&q=80",
    label: "Everyday fresh",
    title: "Ripe picks for your kitchen",
    description: "Everyday fruits selected for flavour and freshness — ready when you are.",
    primaryHref: "/shop",
    primaryLabel: "Shop all fruit",
    secondaryHref: "/shop?organic=1",
    secondaryLabel: "Shop organic",
  },
  {
    id: "citrus",
    image:
      "https://images.unsplash.com/photo-1519996529931-28324d5a39e9?auto=format&fit=crop&w=2000&q=80",
    label: "Bright & juicy",
    title: "Citrus that wakes up mornings",
    description: "Oranges, lemons and more — packed carefully so juiciness travels with them.",
    primaryHref: "/shop?q=orange",
    primaryLabel: "Explore citrus",
    secondaryHref: "/shop",
    secondaryLabel: "Browse catalog",
  },
];

function bannerToSlide(b: CmsBanner): HeroSlide {
  return {
    id: b.id,
    image: b.image_url,
    label: b.label || "Featured",
    title: b.title,
    description: b.description || "",
    primaryHref: b.primary_href || "/shop",
    primaryLabel: b.primary_label || "Shop now",
    secondaryHref: b.secondary_href || undefined,
    secondaryLabel: b.secondary_label || undefined,
  };
}

export function HeroSlider({
  slides: slidesProp,
}: {
  slides?: HeroSlide[];
}) {
  const banners = useQuery(() => cmsApi.listBanners("home_hero"), [], {
    enabled: !slidesProp,
  });

  const slides: HeroSlide[] | null =
    slidesProp ??
    (banners.isLoading
      ? null
      : banners.data && banners.data.length > 0
        ? banners.data.map(bannerToSlide)
        : FALLBACK_SLIDES);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const total = slides?.length ?? 0;
  const active = slides?.[index] ?? slides?.[0];

  useEffect(() => {
    setIndex(0);
  }, [slides?.[0]?.id, total]);

  const go = useCallback(
    (n: number) => {
      if (total <= 0) return;
      setIndex(((n % total) + total) % total);
    },
    [total],
  );

  useEffect(() => {
    if (paused || total <= 1 || !slides) return;
    const id = window.setInterval(() => go(index + 1), 6500);
    return () => window.clearInterval(id);
  }, [go, index, paused, total, slides]);

  if (!slides || !active) {
    return (
      <div className="fs-skeleton min-h-[72vh] w-full sm:min-h-[78vh]" role="status" aria-label="Loading banners" />
    );
  }

  return (
    <section
      className="relative min-h-[72vh] overflow-hidden text-white sm:min-h-[78vh]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
        if (Math.abs(dx) > 40) go(dx < 0 ? index + 1 : index - 1);
        touchX.current = null;
      }}
      aria-roledescription="carousel"
      aria-label="Featured banners"
    >
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === index ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-hidden={i !== index}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slide.image} alt="" className="h-full w-full object-cover" />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-[#4a3728]/80 via-[#4a3728]/40 to-[#f97316]/25"
          />
        </div>
      ))}

      <div className="relative z-10 mx-auto flex min-h-[72vh] max-w-6xl flex-col justify-end px-4 pb-12 sm:min-h-[78vh] sm:px-6 sm:pb-14">
        <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#fdba74]">
          {active.label}
        </p>
        <h1 className="mt-3 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          {active.title}
        </h1>
        {active.description ? (
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/85 sm:text-base">
            {active.description}
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={active.primaryHref} className="fs-btn-primary">
            {active.primaryLabel}
          </Link>
          {active.secondaryHref && active.secondaryLabel ? (
            <Link href={active.secondaryHref} className="fs-btn-soft">
              {active.secondaryLabel}
            </Link>
          ) : null}
        </div>

        <div className="mt-10 flex items-center gap-3">
          <button
            type="button"
            aria-label="Previous"
            onClick={() => go(index - 1)}
            className="grid size-9 place-items-center rounded-full bg-white/20 text-lg backdrop-blur-sm hover:bg-white/30"
          >
            ‹
          </button>
          <div className="flex gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => go(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-7 bg-white" : "w-2 bg-white/40"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Next"
            onClick={() => go(index + 1)}
            className="grid size-9 place-items-center rounded-full bg-white/20 text-lg backdrop-blur-sm hover:bg-white/30"
          >
            ›
          </button>
        </div>
      </div>
    </section>
  );
}
