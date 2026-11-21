import type { Metadata } from "next";
import AboutBio from "@/components/AboutBio";
import BackToStyle from "@/components/BackToStyle";

export const metadata: Metadata = {
  title: "About Brian Wong",
  description:
    "Hi! I'm Brian — an SF Bay Area native who builds fun tools, apps, and games, and leads product at Chromatic.",
};

export default function About() {
  return (
    <main className="about">
      <div className="about-card">
        <div className="about-avatar" aria-hidden="true">
          👋
        </div>
        <h1 className="about-title">
          HI, I&apos;M <span className="pop">BRIAN</span>
        </h1>
        <AboutBio />
        <div className="about-actions">
          <BackToStyle />
        </div>
      </div>
    </main>
  );
}
