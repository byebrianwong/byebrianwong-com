// Lets chrome outside the village (the site nav's About button) open one of
// the village's cards. Kept apart from spots.ts so the nav, which is on every
// page, doesn't pull in the app list.

/** The cabin's spot id, which opens the About card. */
export const ABOUT_ID = "about";

/** A link straight to the village with the About card open. */
export const ABOUT_CARD_HREF = "/#/about";

/** Fired on window with a spot id in `detail`; the village opens that spot's card. */
export const OPEN_CARD_EVENT = "winter:open-card";

/** Ask the village, if it's on the page, to open a spot's card. */
export function openVillageCard(id: string) {
  window.dispatchEvent(new CustomEvent<string>(OPEN_CARD_EVENT, { detail: id }));
}
