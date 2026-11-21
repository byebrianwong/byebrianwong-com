// The site comes in more than one style. Each style is a full page of its own
// that shows the same things (a bit about Brian, and every app and game) in a
// different world. Add a style here and it shows up in the nav's style menu.
//
// The home page ("/") opens whichever style the visitor last used. That choice
// lives in localStorage, so it is per browser and never leaves the device.

export type SiteStyleId = "arcade" | "winter";

export interface SiteStyle {
  id: SiteStyleId;
  /** Shown in the style menu. */
  name: string;
  /** One line under the name in the style menu. */
  blurb: string;
  /** Where the style lives. The arcade is the original, so it owns "/". */
  path: string;
  /** The About page's button back into this style. */
  enter: string;
}

export const SITE_STYLES: SiteStyle[] = [
  { id: "arcade", name: "The App Arcade", blurb: "Rip open a booster pack of app cards", path: "/", enter: "ENTER THE ARCADE" },
  { id: "winter", name: "Winter Village", blurb: "Wander a papier-mâché winter town", path: "/winter", enter: "BACK TO THE VILLAGE" },
];

export const DEFAULT_STYLE = SITE_STYLES[0];

const KEY = "byebrianwong:style";

/** The style a page belongs to, or undefined for pages that aren't a style (like /about). */
export function styleForPath(pathname: string | null | undefined): SiteStyle | undefined {
  if (!pathname) return undefined;
  const clean = pathname.replace(/\/+$/, "") || "/";
  return SITE_STYLES.find((s) => s.path === clean);
}

/** The style this visitor last used, or null if they haven't picked one (or storage is blocked). */
export function readStyle(): SiteStyle | null {
  try {
    const id = window.localStorage.getItem(KEY);
    return SITE_STYLES.find((s) => s.id === id) ?? null;
  } catch {
    return null;
  }
}

/**
 * Remember `id` as this visitor's style. Skipped while the boot script is
 * already sending the tab elsewhere, so a page that renders for a moment on
 * its way out can't overwrite the choice that sent it.
 */
export function saveStyle(id: SiteStyleId) {
  try {
    if ((window as unknown as { __styleRedirect?: boolean }).__styleRedirect) return;
    window.localStorage.setItem(KEY, id);
  } catch {
    /* storage blocked: the site still works, it just won't remember */
  }
}

/**
 * Runs in <head> before the home page paints. A visitor who last used
 * another style is sent there straight away, so they never see the arcade
 * flash first. A link with a hash (a shared arcade card) is left alone.
 */
export const STYLE_BOOT_SCRIPT = `(function(){try{
if(location.pathname!=="/"||location.hash)return;
var p=${JSON.stringify(Object.fromEntries(SITE_STYLES.map((s) => [s.id, s.path])))}[localStorage.getItem(${JSON.stringify(KEY)})];
if(p&&p!=="/"){window.__styleRedirect=true;location.replace(p+location.search);}
}catch(e){}})();`;
