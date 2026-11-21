"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Palette } from "@phosphor-icons/react";
import { SITE_STYLES, saveStyle, styleForPath } from "@/lib/siteStyle";
import { Sound } from "@/lib/sound";

/**
 * The nav button that switches between the site's styles (lib/siteStyle.ts).
 * It opens a small menu with one entry per style; the style you're in is
 * marked. Picking one remembers it, so "/" opens it on the next visit.
 */
export default function StyleSwitcher() {
  const pathname = usePathname();
  const current = styleForPath(pathname);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  // Close on a click outside, or on Escape (handing focus back to the button).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  // A new page closes the menu.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="style-switch" ref={wrap}>
      <button
        ref={button}
        type="button"
        className="snav"
        aria-label="Change the site's style"
        title="Change style"
        aria-expanded={open}
        aria-controls={menuId}
        onMouseEnter={() => Sound.blip()}
        onClick={() => {
          Sound.select();
          setOpen((o) => !o);
        }}
      >
        <Palette weight="fill" aria-hidden="true" />
      </button>
      {open && (
        <div className="style-menu" id={menuId}>
          <p className="style-menu-title">Pick a style</p>
          <ul>
            {SITE_STYLES.map((s) => (
              <li key={s.id}>
                <Link
                  href={s.path}
                  aria-current={s.id === current?.id ? "page" : undefined}
                  onClick={() => {
                    saveStyle(s.id);
                    setOpen(false);
                  }}
                >
                  <b>{s.name}</b>
                  <span>{s.blurb}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
