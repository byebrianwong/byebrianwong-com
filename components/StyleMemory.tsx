"use client";

import { useEffect } from "react";
import { saveStyle, type SiteStyleId } from "@/lib/siteStyle";

/** Remembers that the visitor used this style, so "/" opens it next time. Renders nothing. */
export default function StyleMemory({ id }: { id: SiteStyleId }) {
  useEffect(() => saveStyle(id), [id]);
  return null;
}
