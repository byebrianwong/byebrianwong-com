import Link from "next/link";

/**
 * Persistent site chrome shown on every page (rendered from the root layout):
 * an "About Brian" link and a GitHub link. Styled to match the arcade's other
 * fixed corner controls (the sound toggle, HUD). The arcade's sound button is
 * positioned just to the left of this cluster so they read as one group.
 */
export default function SiteNav() {
  return (
    <nav className="site-nav" aria-label="Site">
      <Link href="/about" className="snav" aria-label="About Brian" title="About Brian">
        {/* person / profile glyph */}
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 12.5a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 1.8c-5.2 0-9.2 2.7-9.2 6.1V22h18.4v-1.6c0-3.4-4-6.1-9.2-6.1Z" />
        </svg>
      </Link>
      <a
        className="snav"
        href="https://github.com/byebrianwong"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Brian on GitHub"
        title="GitHub"
      >
        {/* GitHub mark */}
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
        </svg>
      </a>
    </nav>
  );
}
