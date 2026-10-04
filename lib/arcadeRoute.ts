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

import { APPS } from "./apps";

export type ArcadeRoute =
  | { view: "pack" }
  | { view: "cards" }
  | { view: "inspect"; appId: string };

export const PACK_ROUTE: ArcadeRoute = { view: "pack" };

/** The hash a route is written to the URL as ("" for the sealed pack). */
export function routeToHash(route: ArcadeRoute): string {
  switch (route.view) {
    case "pack":
      return "";
    case "cards":
      return "#/cards";
    case "inspect":
      return `#/card/${route.appId}`;
  }
}

const appRoute = (id: string | undefined): ArcadeRoute =>
  APPS.some((a) => a.id === id) ? { view: "inspect", appId: id! } : { view: "cards" };

/**
 * Read a route back out of a hash. Anything unrecognised (a stale link, a
 * renamed app, a hand-typed URL) falls back to the nearest screen that does
 * exist, so a bad hash can never strand the arcade on a screen with no data.
 *
 * Links from the old two-pack layout still work: `#/packs` is the pack,
 * `#/pack/<pack>` is the cards, and `#/pack/<pack>/<app>` is that card.
 */
export function parseHash(hash: string): ArcadeRoute {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);

  if (parts.length === 0) return PACK_ROUTE;
  if (parts[0] === "cards" && parts.length === 1) return { view: "cards" };
  if (parts[0] === "card" && parts.length === 2) return appRoute(parts[1]);
  if (parts[0] === "packs" && parts.length === 1) return PACK_ROUTE;
  if (parts[0] === "pack" && parts.length === 2) return { view: "cards" };
  if (parts[0] === "pack" && parts.length === 3) return appRoute(parts[2]);
  return PACK_ROUTE;
}

/** The screen one level up — where an in-app back control should land. */
export function parentRoute(route: ArcadeRoute): ArcadeRoute {
  return route.view === "inspect" ? { view: "cards" } : PACK_ROUTE;
}

export const sameRoute = (a: ArcadeRoute, b: ArcadeRoute) =>
  routeToHash(a) === routeToHash(b);
