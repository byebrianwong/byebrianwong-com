import type { Metadata, Viewport } from "next";
import StyleMemory from "@/components/StyleMemory";
import WinterVillage from "@/components/winter/WinterVillage";

export const metadata: Metadata = {
  title: "Brian Wong · Winter Village",
  description:
    "A papier-mâché winter village where every building is an app or game built by Brian Wong. Look around, then step inside.",
  openGraph: {
    title: "Brian Wong · Winter Village",
    description: "A papier-mâché winter village of apps and games. Look around, then step inside.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#c7cde6",
};

export default function Winter() {
  return (
    <>
      <StyleMemory id="winter" />
      <WinterVillage />
    </>
  );
}
