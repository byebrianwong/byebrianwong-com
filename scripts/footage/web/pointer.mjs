// A visible mouse pointer for recordings. Headless Chrome draws none, so
// without it clicks and drags in the footage seem to happen on their own.

/** Draw a pointer that follows the mouse on every page the tab opens. Call before page.goto. */
export async function showPointer(page) {
  await page.addInitScript(() => {
    addEventListener('DOMContentLoaded', () => {
      const cur = document.createElement('div');
      cur.innerHTML =
        '<svg width="22" height="22" viewBox="0 0 22 22"><path d="M3 2l14 8.5-6.2 1.4L8 18z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
      Object.assign(cur.style, {
        position: 'fixed', left: '0', top: '0', zIndex: '2147483647', pointerEvents: 'none',
        transform: 'translate(-100px,-100px)', transition: 'scale .12s', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.4))',
      });
      document.documentElement.appendChild(cur);
      const at = (x, y) => (cur.style.transform = `translate(${x - 3}px,${y - 2}px)`);
      // A new page starts with the pointer where the last one left it.
      const last = JSON.parse(sessionStorage.getItem('__pointer') || 'null');
      if (last) at(last[0], last[1]);
      addEventListener('mousemove', (e) => {
        at(e.clientX, e.clientY);
        sessionStorage.setItem('__pointer', JSON.stringify([e.clientX, e.clientY]));
      }, true);
      addEventListener('mousedown', () => (cur.style.scale = '0.85'), true);
      addEventListener('mouseup', () => (cur.style.scale = '1'), true);
    });
  });
}

/** Move the mouse to the centre of an element, in a smooth line. */
export async function pointAt(page, locator, steps = 18) {
  const b = await locator.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps });
}

/** Move to an element, pause the way a person would, and click it. */
export async function clickOn(page, locator, { steps = 18, pause = 200 } = {}) {
  await locator.scrollIntoViewIfNeeded();
  await pointAt(page, locator, steps);
  await page.waitForTimeout(pause);
  await page.mouse.down();
  await page.waitForTimeout(60);
  await page.mouse.up();
}
