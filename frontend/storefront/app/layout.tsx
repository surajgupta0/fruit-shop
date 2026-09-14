import type { Metadata } from "next";

import { Providers } from "@/src/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Fruit Shop — Fresh fruit, delivered",
    template: "%s · Fruit Shop",
  },
  description: "Hand-picked seasonal fruits, packed after you order and delivered fresh.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-full flex-col bg-[var(--fs-canvas)] text-[var(--fs-ink)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
