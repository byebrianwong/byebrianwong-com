// URL <-> screen mapping for the arcade.
//
// The arcade is a single page that swaps between screens with local state, so
// without help the browser's back button leaves the site entirely no matter how
// deep you've clicked. Each screen gets a hash URL instead, which lets the
// component push a real history entry per screen and rebuild itself from the
// URL on back/forward, reload, or a shared link.
//
// Hashes are used (rather than real paths) so the whole thing stays one static
// route, and every hash starts with `/` so it can never collide with an element
// id and trigger the browser's scroll-to-anchor behaviour.

import { APPS, PACKS, type PackId } from "./apps";

export type ArcadeRoute =
  | { view: "title" }
  | { view: "select" }
  | { view: "reveal"; packId: PackId }
  | { view: "inspect"; packId: PackId; appId: string };

export const TITLE_ROUTE: ArcadeRoute = { view: "title" };

/** The hash a route is written to the URL as ("" for the attract screen). */
export function routeToHash(route: ArcadeRoute): string {
  switch (route.view) {
    case "title":
      return "";
    case "select":
      return "#/packs";
    case "reveal":
      return `#/pack/${route.packId}`;
    case "inspect":
      return `#/pack/${route.packId}/${route.appId}`;
  }
}

/**
 * Read a route back out of a hash. Anything unrecognised — a stale link, a
 * renamed app, a hand-typed URL — falls back to the nearest screen that does
 * exist (ultimately the title), so a bad hash can never strand the arcade in a
 * phase with no data behind it.
 */
export function parseHash(hash: string): ArcadeRoute {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);

  if (parts.length === 0) return TITLE_ROUTE;
  if (parts[0] === "packs" && parts.length === 1) return { view: "select" };
  if (parts[0] !== "pack") return TITLE_ROUTE;

  const pack = PACKS.find((p) => p.id === parts[1]);
  if (!pack) return TITLE_ROUTE;
  if (parts.length === 2) return { view: "reveal", packId: pack.id };
  if (parts.length > 3) return TITLE_ROUTE;

  const app = APPS.find((a) => a.id === parts[2] && a.pack === pack.id);
  return app
    ? { view: "inspect", packId: pack.id, appId: app.id }
    : { view: "reveal", packId: pack.id };
}

/** The screen one level up — where an in-app back control should land. */
export function parentRoute(route: ArcadeRoute): ArcadeRoute {
  switch (route.view) {
    case "inspect":
      return { view: "reveal", packId: route.packId };
    case "reveal":
      return { view: "select" };
    default:
      return TITLE_ROUTE;
  }
}

export const sameRoute = (a: ArcadeRoute, b: ArcadeRoute) =>
  routeToHash(a) === routeToHash(b);
