"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";

export type HeroSlide = {
  id: string;
  image: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};

const DEFAULT_SLIDES: HeroSlide[] = [
  {
    id: "seasonal",
    image:
      "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=2400&q=80",
    eyebrow: "In season now",
    title: "Fresh fruit that tastes like sunshine",
    subtitle:
      "Hand-picked seasonal favourites, packed after you order — farm-to-door care for every box.",
    ctaLabel: "Shop seasonal",
    ctaHref: "/shop",
    secondaryLabel: "View bestsellers",
    secondaryHref: "/shop?featured=1",
  },
  {
    id: "exotic",
    image:
      "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=2400&q=80",
    eyebrow: "Exotic picks",
    title: "Imported berries, kiwi & more",
    subtitle:
      "Premium exotics for gift boxes and everyday indulgence — curated like a boutique fruit counter.",
    ctaLabel: "Explore catalog",
    ctaHref: "/shop",
    secondaryLabel: "Organic only",
    secondaryHref: "/shop?organic=1",
  },
  {
    id: "promise",
    image:
      "https://images.unsplash.com/photo-1519996529931-28324d5a39e9?auto=format&fit=crop&w=2400&q=80",
    eyebrow: "Our promise",
    title: "Ripe when it arrives",
    subtitle:
      "Cold-care packing, easy phone OTP checkout, and delivery that keeps fruit tasting orchard-fresh.",
    ctaLabel: "Start shopping",
    ctaHref: "/shop",
    secondaryLabel: "Create account",
    secondaryHref: "/signup",
  },
];

type Props = {
  slides?: HeroSlide[];
  intervalMs?: number;
  topSlot?: ReactNode;
};

export function HeroSlider({
  slides = DEFAULT_SLIDES,
  intervalMs = 6500,
  topSlot,
}: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = slides.length;
  const active = slides[index] ?? slides[0];

  const go = useCallback(
    (next: number) => {
      setIndex(((next % total) + total) % total);
    },
    [total],
  );

  useEffect(() => {
    if (paused || total <= 1) return;
    const id = window.setInterval(() => go(index + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [go, index, intervalMs, paused, total]);

  if (!active) return null;

  return (
    <section
      className="relative flex min-h-[88dvh] flex-col overflow-hidden text-white sm:min-h-[92dvh]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured fruit banners"
    >
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-700 ease-out ${
            i === index ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-hidden={i !== index}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.image}
            alt=""
            className={`h-full w-full object-cover ${i === index ? "fs-kenburns" : ""}`}
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(115deg,rgba(18,53,40,0.88)_0%,rgba(26,22,20,0.45)_55%,rgba(18,53,40,0.25)_100%)]"
          />
        </div>
      ))}

      <div className="relative z-10 flex min-h-[88dvh] flex-col sm:min-h-[92dvh]">
        {topSlot}
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-end px-4 pb-16 pt-8 sm:px-6 sm:pb-20 lg:px-8">
          <p key={`${active.id}-eye`} className="fs-rise fs-eyebrow !text-[var(--fs-citrus)]">
            {active.eyebrow}
          </p>
          <p
            key={`${active.id}-brand`}
            className="fs-rise mt-3 font-[family-name:var(--font-display)] text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl"
          >
            Fruit Shop
          </p>
          <h1
            key={`${active.id}-title`}
            className="fs-rise-delay mt-4 max-w-xl text-xl font-semibold text-white/95 sm:text-2xl"
          >
            {active.title}
          </h1>
          <p
            key={`${active.id}-sub`}
            className="fs-rise-delay mt-3 max-w-md text-sm leading-relaxed text-white/70 sm:text-base"
          >
            {active.subtitle}
          </p>
          <div key={`${active.id}-cta`} className="fs-rise-late mt-8 flex flex-wrap gap-3">
            <Link href={active.ctaHref} className="fs-btn-primary">
              {active.ctaLabel}
            </Link>
            {active.secondaryHref && active.secondaryLabel ? (
              <Link href={active.secondaryHref} className="fs-btn-ghost">
                {active.secondaryLabel}
              </Link>
            ) : null}
          </div>

          <div className="mt-10 flex items-center gap-3">
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => go(index - 1)}
              className="grid size-10 place-items-center rounded-full border border-white/30 bg-white/10 text-lg text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              <span aria-hidden>‹</span>
            </button>
            <div className="flex items-center gap-2" role="tablist" aria-label="Slides">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => go(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? "w-8 bg-[var(--fs-mango)]" : "w-2.5 bg-white/40 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => go(index + 1)}
              className="grid size-10 place-items-center rounded-full border border-white/30 bg-white/10 text-lg text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              <span aria-hidden>›</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
