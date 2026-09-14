import type { Metadata } from "next";

import { Providers } from "@/src/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Fruit Shop — Fresh fruit, delivered happy",
    template: "%s · Fruit Shop",
  },
  description:
    "Colorful fresh fruit delivered to your door. Seasonal picks, exotic finds, and easy phone OTP checkout.",
  openGraph: {
    title: "Fruit Shop",
    description: "Juicy fresh fruit, delivered with a smile.",
    type: "website",
  },
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
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Nunito:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-full flex-col bg-[var(--fs-canvas)] text-[var(--fs-ink)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
