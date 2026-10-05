import type { AppCard } from "@/lib/apps";

/**
 * The big button on every detail screen that opens the real app in a new tab.
 * Games say PLAY; everything else says LAUNCH. The small line under the verb
 * shows the address it opens. An app whose link is "#" isn't live yet, so it
 * gets a greyed-out COMING SOON button that does nothing.
 */
export default function LaunchButton({ app }: { app: AppCard }) {
  if (app.link === "#") {
    return (
      <span className="launch soon" aria-disabled="true">
        <span className="verb">🔒 COMING SOON</span>
      </span>
    );
  }

  const verb = app.game ? "PLAY" : "LAUNCH";
  const url = new URL(app.link);
  const where = url.host + (url.pathname === "/" ? "" : url.pathname);

  return (
    <a
      className="launch"
      href={app.link}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${app.game ? "Play" : "Launch"} ${app.name} (opens in a new tab)`}
    >
      <span className="verb">
        <span className="tri" aria-hidden="true" />
        {verb}
      </span>
      <span className="where">{where} ↗</span>
    </a>
  );
}
