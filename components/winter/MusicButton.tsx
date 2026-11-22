"use client";

import { MusicNotes, SpeakerSimpleSlash } from "@phosphor-icons/react";

/**
 * The winter village's music switch, in the bottom-right corner. It shows
 * music notes while the carols play and a muted speaker otherwise. Browsers
 * keep a page silent until the visitor first clicks or presses a key, so the
 * village shows it muted until then.
 */
export default function MusicButton({ playing, onToggle }: { playing: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="wv-music"
      aria-pressed={playing}
      aria-label={playing ? "Turn the music off" : "Play music"}
      title={playing ? "Turn the music off" : "Play music"}
      onClick={onToggle}
    >
      {playing ? <MusicNotes weight="fill" aria-hidden="true" /> : <SpeakerSimpleSlash weight="fill" aria-hidden="true" />}
    </button>
  );
}
