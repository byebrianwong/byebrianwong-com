// The site comes in more than one style. Each style is a full page of its own
// that shows the same things (a bit about Brian, and every app and game) in a
// different world. Add a style here and it shows up in the nav's style menu.
//
// The Winter Village is the default and owns "/". A visitor who picks another
// style in the menu is remembered (in localStorage, so per browser, and it
// never leaves the device), and "/" sends them to that style on later visits.
// Only picking from the menu counts; landing on a style's page from a link
// doesn't change what "/" opens.

export type SiteStyleId = "arcade" | "winter";

export interface SiteStyle {
  id: SiteStyleId;
  /** Shown in the style menu. */
  name: string;
  /** One line under the name in the style menu. */
  blurb: string;
  /** Where the style lives. */
  path: string;
  /** The About page's button back into this style. */
  enter: string;
}

export const SITE_STYLES: SiteStyle[] = [
  { id: "winter", name: "Winter Village", blurb: "Wander a papier-mâché winter town", path: "/", enter: "BACK TO THE VILLAGE" },
  { id: "arcade", name: "The App Arcade", blurb: "Rip open a booster pack of app cards", path: "/arcade", enter: "ENTER THE ARCADE" },
];

/** What a new visitor sees. */
export const DEFAULT_STYLE = SITE_STYLES[0];

/**
 * Where the visitor's pick is kept. (An earlier key, "byebrianwong:style",
 * was also written just by visiting a page, so it isn't read any more.)
 */
export const STYLE_KEY = "byebrianwong:style-choice";

/** The style a page belongs to, or undefined for pages that aren't a style (like /about). */
export function styleForPath(pathname: string | null | undefined): SiteStyle | undefined {
  if (!pathname) return undefined;
  const clean = pathname.replace(/\/+$/, "") || "/";
  return SITE_STYLES.find((s) => s.path === clean);
}

/** The style this visitor picked, or null if they never picked one (or storage is blocked). */
export function readStyle(): SiteStyle | null {
  try {
    const id = window.localStorage.getItem(STYLE_KEY);
    return SITE_STYLES.find((s) => s.id === id) ?? null;
  } catch {
    return null;
  }
}

/** Remember the style the visitor picked from the style menu. */
export function saveStyle(id: SiteStyleId) {
  try {
    window.localStorage.setItem(STYLE_KEY, id);
  } catch {
    /* storage blocked: the site still works, it just won't remember */
  }
}

/**
 * Runs in <head> before "/" paints:
 * - A visitor who picked another style is sent there straight away, so the
 *   village never flashes first.
 * - Old arcade links to its card grid or packs (`/#/cards`, `/#/pack/...`,
 *   from when the arcade owned "/") go to the arcade. Card links
 *   (`/#/card/<app>`) stay: the village opens the same app's card.
 */
export const STYLE_BOOT_SCRIPT = `(function(){try{
if(location.pathname!=="/")return;
if(/^#\\/(cards|packs?)(\\/|$)/.test(location.hash)){location.replace(${JSON.stringify(SITE_STYLES.find((s) => s.id === "arcade")!.path)}+location.search+location.hash);return;}
if(location.hash)return;
var p=${JSON.stringify(Object.fromEntries(SITE_STYLES.map((s) => [s.id, s.path])))}[localStorage.getItem(${JSON.stringify(STYLE_KEY)})];
if(p&&p!=="/")location.replace(p+location.search);
}catch(e){}})();`;
