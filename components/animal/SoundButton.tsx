"use client";

import { Pause, Volume2, VolumeX } from "lucide-react";
import * as React from "react";

import { useSettings } from "@/components/settings/SettingsProvider";
import { Button } from "@/components/ui/button";
import { volumeGain } from "@/lib/user-settings";

/**
 * Plays the species' call recording.
 *
 * The recording is fetched **on demand**: `preload="none"` means the browser does
 * not touch the file until the visitor presses play, which is what keeps a species
 * page free of a megabyte of audio nobody asked for. When `sound_url` is null the
 * control renders disabled with an explicit reason rather than silently doing
 * nothing.
 *
 * The gain is the visitor's own master × call volume (Phase 11). Autoplay is opt-in
 * and bows to the browser: an automatic `play()` before any interaction is rejected,
 * which is reported as the same "playback blocked" state a manual press would get
 * rather than being swallowed.
 *
 * Files come from `scripts/fetch-sounds.mjs`, which refuses any recording whose
 * licence is not CC0 or CC BY and credits the rest on the page (see
 * `lib/attribution.ts`); they live in `public/sounds/` and are mirrored in the
 * `animal-sounds` storage bucket.
 */
export function SoundButton({ soundUrl, animalName }: { soundUrl: string | null; animalName: string }) {
  const { settings } = useSettings();
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const attempted = React.useRef(false);
  const [playing, setPlaying] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  const gain = volumeGain(settings.masterVolume, settings.animalVolume);

  React.useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  // Keep the element in step with the sliders, including while it is playing.
  React.useEffect(() => {
    if (audioRef.current) audioRef.current.volume = gain;
  }, [gain]);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !soundUrl || !settings.autoplaySounds || attempted.current) return;
    if (gain <= 0) return;

    attempted.current = true;
    audio.volume = gain;
    audio
      .play()
      .then(() => setPlaying(true))
      // Almost always the browser's autoplay policy, which needs a gesture first.
      .catch(() => setFailed(true));
  }, [settings.autoplaySounds, soundUrl, gain]);

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
      audio.volume = gain;
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
