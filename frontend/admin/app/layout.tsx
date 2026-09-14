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
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Outfit:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-full flex-col bg-[var(--fs-cream)] text-[var(--fs-ink)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
