import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";

import { Providers } from "@/src/providers";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Fruit Shop — Fresh fruit, delivered",
    template: "%s · Fruit Shop",
  },
  description:
    "Order farm-fresh fruit online. Seasonal picks, organic options, and doorstep delivery.",
  openGraph: {
    title: "Fruit Shop",
    description: "Farm-fresh fruit, delivered to your door.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${outfit.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[var(--fs-cream)] text-[var(--fs-ink)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
