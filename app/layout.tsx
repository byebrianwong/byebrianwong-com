import type { Metadata, Viewport } from "next";
import "./globals.css";
import SiteNav from "@/components/SiteNav";
import { STYLE_BOOT_SCRIPT } from "@/lib/siteStyle";

// Defaults for every page; the village (/) and the arcade (/arcade) set their own.
export const metadata: Metadata = {
  title: "Brian Wong",
  description: "Fun tools, apps, and games built by Brian Wong.",
  openGraph: {
    title: "Brian Wong",
    description: "Fun tools, apps, and games built by Brian Wong.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#4c1d95",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Sends a visitor who last used another style there before "/" paints. */}
        <script dangerouslySetInnerHTML={{ __html: STYLE_BOOT_SCRIPT }} />
      </head>
      <body>
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
