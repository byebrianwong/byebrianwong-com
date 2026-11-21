// The places you can step into in the winter village: one building per app,
// plus Brian's cabin for the About card. Kept free of three.js so the page's
// overlay (hover tag, cards, keyboard directory) can use it without loading
// the 3D scene.

import { APPS } from "@/lib/apps";

export const ABOUT_ID = "about";

export interface Spot {
  id: string;
  name: string;
  tagline: string;
  accent: string;
}

const ABOUT_SPOT: Spot = { id: ABOUT_ID, name: "About Brian", tagline: "Who built this village", accent: "#c8463d" };

/** Every spot, apps first in their data order, then the cabin. */
export const SPOTS: Spot[] = [...APPS.map(({ id, name, tagline, accent }) => ({ id, name, tagline, accent })), ABOUT_SPOT];

export const spotById = (id: string | null | undefined) => SPOTS.find((s) => s.id === id) ?? null;
