"use client";

import { Pause, Volume2, VolumeX } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";

/**
 * Plays the species' call recording.
 *
 * There is no audio in the repository (call recordings are licensed
 * individually), so when `sound_url` is null the control is rendered disabled
 * with an explicit reason rather than silently doing nothing. Upload an
 * `.mp3`/`.ogg` to the `animal-assets` bucket and set `sound_url` to enable it.
 */
export function SoundButton({ soundUrl, animalName }: { soundUrl: string | null; animalName: string }) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  if (!soundUrl) {
    return (
      <Button type="button" variant="secondary" disabled title="No call recording has been uploaded for this species">
        <VolumeX />
        Call not recorded yet
      </Button>
    );
  }

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      audio.currentTime = 0;
      setPlaying(false);
      return;
    }

    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setFailed(true);
      setPlaying(false);
    }
  }

  return (
    <>
      <audio ref={audioRef} src={soundUrl} preload="none" onEnded={() => setPlaying(false)} />
      <Button type="button" variant={playing ? "iris" : "secondary"} onClick={toggle} aria-live="polite">
        {playing ? <Pause /> : <Volume2 />}
        {failed ? "Playback blocked — try again" : playing ? `Playing ${animalName}` : `Hear the ${animalName}`}
      </Button>
    </>
  );
}
