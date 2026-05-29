import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brian Wong — The App Arcade",
  description:
    "A booster-pack arcade of apps built by Brian Wong. Rip open a pack and collect the cards.",
  openGraph: {
    title: "Brian Wong — The App Arcade",
    description: "Rip open a booster pack and collect the apps.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#4c1d95",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
