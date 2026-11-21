/** External link styled as an inline "@handle" inside the bio. */
function Ln({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a className="ln" href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

/**
 * Brian's bio, two paragraphs. Shared by the About page and the cabin in the
 * winter village, so the words only live in one place. Each place styles the
 * paragraphs and the `.ln` links itself.
 */
export default function AboutBio() {
  return (
    <>
      <p>
        An SF Bay Area native who enjoys building fun things and playing sportsballs. Check out
        the weird tools, apps, and games I&apos;ve built.
      </p>
      <p>
        I currently lead product <Ln href="https://www.chromatic.com">@chromatic</Ln> (makers of{" "}
        <Ln href="https://storybook.js.org">@storybook</Ln>) for all your agentic AI UI workflows.
        Prefer paper to all these AI pixels? Check out stationery and journaling{" "}
        <Ln href="https://www.instagram.com/paperandmilk/">@paperandmilk</Ln>. And if
        you want to say hi, send me a{" "}
        <a className="ln" href="mailto:brian@byebrianwong.com">message</a>!
      </p>
    </>
  );
}
