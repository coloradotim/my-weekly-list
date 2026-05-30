import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { getSupabaseConfig } from "@/lib/supabase/env";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Weekly List",
  description: "A calm weekly planning ritual for one private user.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "My Weekly List",
    statusBarStyle: "default",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fffaf2",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const supabaseConfig = getSupabaseConfig();

  return (
    <html lang="en">
      {supabaseConfig.status === "configured" ? (
        <head>
          <link rel="preconnect" href={supabaseConfig.url} />
          <link rel="dns-prefetch" href={supabaseConfig.url} />
        </head>
      ) : null}
      <body>
        <div className="min-h-screen bg-paper text-ink">{children}</div>
      </body>
    </html>
  );
}
