import type { Metadata } from "next";

import { Providers } from "@/src/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Fruit Shop Admin",
    template: "%s · Fruit Shop Admin",
  },
  description: "Manage catalog, orders, and staff for Fruit Shop.",
  robots: { index: false, follow: false },
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
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Figtree:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-full flex-col bg-[var(--fs-canvas)] text-[var(--fs-ink)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
