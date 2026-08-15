import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Niaga Analytics — Sales & revenue intelligence for Indonesian marketplaces",
  description:
    "Paste any Shopee, TikTok Shop, Tokopedia or Blibli store link and get an estimated revenue model, top-SKU breakdown and catalogue health report in seconds.",
  keywords: [
    "shopee analytics",
    "tiktok shop analytics",
    "tokopedia",
    "blibli",
    "riset produk",
    "estimasi omzet",
    "indonesia ecommerce",
  ],
  openGraph: {
    title: "Niaga Analytics",
    description:
      "Estimated revenue, unit velocity and catalogue health for any Indonesian marketplace store.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#08080a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="page-backdrop">
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
