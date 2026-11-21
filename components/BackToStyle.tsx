"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DEFAULT_STYLE, readStyle, type SiteStyle } from "@/lib/siteStyle";

/**
 * The About page's way back: into whichever style the visitor last used. The
 * server can't see that choice, so it renders the default style first and
 * switches after mount.
 */
export default function BackToStyle() {
  const [style, setStyle] = useState<SiteStyle>(DEFAULT_STYLE);
  useEffect(() => setStyle(readStyle() ?? DEFAULT_STYLE), []);
  return (
    <Link className="about-btn" href={style.path}>
      ◄ {style.enter}
    </Link>
  );
}
