import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Brian Wong",
  description:
    "Hi! I'm Brian — an SF Bay Area native who builds fun tools, apps, and games, and leads product at Chromatic.",
};

/** External link styled as an inline "@handle" inside the bio. */
function Ln({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a className="ln" href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

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
        <p>
          An SF Bay Area native who enjoys building fun things and playing sportsballs. Come check
          out some weird tools, apps, and games I&apos;ve built. I currently lead product{" "}
          <Ln href="https://www.chromatic.com">@chromatic</Ln> (makers of{" "}
          <Ln href="https://storybook.js.org">@storybook</Ln>) for all your agentic AI UI workflows.
          If you like to touch grass and the real analog world, check out stationery and
          journaling <Ln href="https://www.instagram.com/paperandmilk/">@paperandmilk</Ln>. And if
          you want to say hi, send me a{" "}
          <a className="ln" href="mailto:brian@byebrianwong.com">message</a>!
        </p>
        <div className="about-actions">
          <Link className="about-btn" href="/">
            ◄ ENTER THE ARCADE
          </Link>
        </div>
      </div>
    </main>
  );
}
