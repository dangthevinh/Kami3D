"use client";

import { Bell, Gauge, Languages, Palette, ShieldCheck, Sparkles, UserRound, Volume2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { useQuality } from "@/components/3d/useQuality";
import { ChoiceGroup, SettingRow, SettingsCard, Switch, VolumeSlider } from "@/components/settings/Controls";
import { useSettings } from "@/components/settings/SettingsProvider";
import { Button } from "@/components/ui/button";
import { messagesFor, type MessageKey } from "@/lib/i18n";
import { qualityFor, readDeviceFacts, tierForPreset, type QualityTier } from "@/lib/quality";
import { playTone } from "@/lib/ui-sound";
import {
  ACCENT_COLORS,
  ACCENT_SWATCHES,
  GLASS_INTENSITIES,
  LANGUAGES,
  MAX_DPRS,
  QUALITY_PRESETS,
  THEME_CHOICES,
  MEASUREMENT_UNITS,
  volumeGain,
  type AccentColor,
  type GlassIntensity,
  type LanguageCode,
  type MaxDpr,
  type MeasurementUnit,
  type QualityPreset,
  type ThemeChoice,
} from "@/lib/user-settings";

/**
 * The settings panel (Phase 11).
 *
 * Every control writes through `useSettings`, which applies the change immediately
 * and persists it (to the account when there is one, to this browser otherwise), so
 * the panel never has a Save button and never shows a value it is not using.
 *
 * The three preferences that live in CSS — accent, glass, motion — are visible on
 * the way out of this page; the rest are visible where they belong (the canvases,
 * the call player, the measurements).
 */

export interface SettingsScreenProps {
  /** From the server, so the account card is right on first paint. */
  user: { id: string; name: string | null; imageUrl: string | null } | null;
  provider: "clerk" | "supabase" | "none";
}

export function SettingsScreen({ user, provider }: SettingsScreenProps) {
  const { settings, ready, signedIn, source, saving, error, update, reset } = useSettings();
  const quality = useQuality();
  const t = React.useCallback((key: MessageKey) => messagesFor(settings.language)[key], [settings.language]);

  // What the device measured, before the preset had its say: the panel can then
  // explain why "Automatic" chose the tier it did.
  const [measured, setMeasured] = React.useState<QualityTier | null>(null);
  React.useEffect(() => setMeasured(qualityFor(readDeviceFacts()).tier), []);

  // The page language is an attribute on <html>, which is what a screen reader and
  // the browser's own spell-checker read.
  React.useEffect(() => {
    document.documentElement.lang = settings.language;
  }, [settings.language]);

  const [purge, setPurge] = React.useState<{ state: "idle" | "confirm" | "busy" | "done" | "partial"; message?: string }>({
    state: "idle",
  });

  const signedInNow = signedIn || Boolean(user);

  async function deleteMyData() {
    setPurge({ state: "busy" });
    try {
      const response = await fetch("/api/settings", { method: "DELETE" });
      if (!response.ok) throw new Error(String(response.status));
      setPurge({ state: "done", message: t("account.deleted") });
    } catch {
      setPurge({ state: "partial", message: t("account.deletedPartial") });
    }
  }

  return (
    <div className="section-shell py-10 sm:py-14">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neon">Kami3D</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {t("page.title")}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/55">{t("page.subtitle")}</p>
        </div>

        <div className="flex items-center gap-2">
          <span
            data-state={ready ? (signedInNow ? "account" : "browser") : "loading"}
            className="rounded-full bg-white/6 px-3 py-1.5 text-[11px] text-white/55 ring-1 ring-white/10"
          >
            {!ready ? "…" : saving ? t("save.saving") : signedInNow ? t("save.account") : t("save.browser")}
          </span>
          <Button variant="ghost" size="sm" onClick={reset} title={t("account.resetHint")}>
            {t("account.reset")}
          </Button>
        </div>
      </header>

      <p className="mt-3 flex items-center gap-2 text-xs text-white/40">
        <Sparkles className="size-3.5 text-neon" aria-hidden />
        {t("page.scope")}
      </p>

      {error ? (
        <p role="status" className="mt-5 rounded-2xl bg-solar/12 px-4 py-3 text-xs text-solar ring-1 ring-solar/25">
          {t("save.failed")}
        </p>
      ) : null}

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <SettingsCard id="appearance" icon={Palette} title={t("appearance.title")} description={t("appearance.hint")}>
          <SettingRow label={t("appearance.theme")} hint={t("appearance.themeHint")}>
            <ChoiceGroup<ThemeChoice>
              name="theme"
              setting="theme"
              label={t("appearance.theme")}
              value={settings.theme}
              onChange={(theme) => update({ theme })}
              options={THEME_CHOICES.map((choice) => ({ value: choice, label: t(`theme.${choice}` as MessageKey) }))}
            />
          </SettingRow>

          <SettingRow label={t("appearance.accent")} hint={t("appearance.accentHint")}>
            <ChoiceGroup<AccentColor>
              name="accent"
              setting="accentColor"
              label={t("appearance.accent")}
              value={settings.accentColor}
              onChange={(accentColor) => update({ accentColor })}
              columns={5}
              options={ACCENT_COLORS.map((choice) => ({
                value: choice,
                label: t(`accent.${choice}` as MessageKey),
                swatch: ACCENT_SWATCHES[choice],
              }))}
            />
          </SettingRow>

          <SettingRow label={t("appearance.glass")} hint={t("appearance.glassHint")}>
            <ChoiceGroup<GlassIntensity>
              name="glass"
              setting="glassIntensity"
              label={t("appearance.glass")}
              value={settings.glassIntensity}
              onChange={(glassIntensity) => update({ glassIntensity })}
              options={GLASS_INTENSITIES.map((choice) => ({ value: choice, label: t(`glass.${choice}` as MessageKey) }))}
            />
          </SettingRow>

          <SettingRow label={t("appearance.motion")} hint={t("appearance.motionHint")}>
            <Switch
              setting="reduceMotion"
              label={t("appearance.motion")}
              checked={settings.reduceMotion}
              onChange={(reduceMotion) => update({ reduceMotion })}
            />
          </SettingRow>
        </SettingsCard>

        <SettingsCard id="performance" icon={Gauge} title={t("performance.title")} description={t("performance.hint")}>
          <SettingRow label={t("performance.preset")} hint={t("performance.presetHint")}>
            <ChoiceGroup<QualityPreset>
              name="preset"
              setting="qualityPreset"
              label={t("performance.preset")}
              value={settings.qualityPreset}
              onChange={(qualityPreset) => update({ qualityPreset })}
              columns={5}
              options={QUALITY_PRESETS.map((choice) => ({ value: choice, label: t(`preset.${choice}` as MessageKey) }))}
            />
          </SettingRow>

          <p className="rounded-xl bg-white/4 px-3 py-2 text-[11px] leading-relaxed text-white/45 ring-1 ring-white/8">
            {t("performance.measured")}: <span className="text-white/70">{measured ?? "…"}</span>
            {" · "}
            <span className="text-white/70">{tierForPreset(settings.qualityPreset, quality.tier)}</span>
            {" @ "}
            <span className="text-white/70">{quality.dpr[1]}×</span>
          </p>

          <SettingRow label={t("performance.shadows")} hint={t("performance.shadowsHint")}>
            <Switch
              setting="enableShadows"
              label={t("performance.shadows")}
              checked={settings.enableShadows}
              onChange={(enableShadows) => update({ enableShadows })}
            />
          </SettingRow>

          <SettingRow label={t("performance.reflections")} hint={t("performance.reflectionsHint")}>
            <Switch
              setting="enableReflections"
              label={t("performance.reflections")}
              checked={settings.enableReflections}
              onChange={(enableReflections) => update({ enableReflections })}
            />
          </SettingRow>

          <SettingRow label={t("performance.dpr")} hint={t("performance.dprHint")}>
            <ChoiceGroup<MaxDpr>
              name="dpr"
              setting="maxDpr"
              label={t("performance.dpr")}
              value={settings.maxDpr}
              onChange={(maxDpr) => update({ maxDpr })}
              options={MAX_DPRS.map((choice) => ({ value: choice, label: `${choice}×` }))}
            />
          </SettingRow>

          <SettingRow label={t("performance.autoRotate")} hint={t("performance.autoRotateHint")}>
            <Switch
              setting="autoRotate"
              label={t("performance.autoRotate")}
              checked={settings.autoRotate}
              onChange={(autoRotate) => update({ autoRotate })}
            />
          </SettingRow>
        </SettingsCard>

        <SettingsCard id="audio" icon={Volume2} title={t("audio.title")} description={t("audio.hint")}>
          <SettingRow label={t("audio.master")} htmlFor="master-volume">
            <VolumeSlider
              id="master-volume"
              setting="masterVolume"
              label={t("audio.master")}
              value={settings.masterVolume}
              onChange={(masterVolume) => update({ masterVolume })}
            />
          </SettingRow>

          <SettingRow label={t("audio.animal")} htmlFor="animal-volume">
            <VolumeSlider
              id="animal-volume"
              setting="animalVolume"
              label={t("audio.animal")}
              value={settings.animalVolume}
              onChange={(animalVolume) => update({ animalVolume })}
            />
          </SettingRow>

          <SettingRow label={t("audio.ui")} hint={t("audio.uiHint")}>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!settings.uiSounds || volumeGain(settings.masterVolume, settings.uiSounds ? 100 : 0) <= 0}
                onClick={() => playTone("correct", volumeGain(settings.masterVolume, 100))}
              >
                {t("audio.test")}
              </Button>
              <Switch
                setting="uiSounds"
                label={t("audio.ui")}
                checked={settings.uiSounds}
                onChange={(uiSounds) => update({ uiSounds })}
              />
            </div>
          </SettingRow>

          <SettingRow label={t("audio.autoplay")} hint={t("audio.autoplayHint")}>
            <Switch
              setting="autoplaySounds"
              label={t("audio.autoplay")}
              checked={settings.autoplaySounds}
              onChange={(autoplaySounds) => update({ autoplaySounds })}
            />
          </SettingRow>
        </SettingsCard>

        <SettingsCard id="region" icon={Languages} title={t("region.title")} description={t("region.hint")}>
          <SettingRow label={t("region.language")}>
            <ChoiceGroup<LanguageCode>
              name="language"
              setting="language"
              label={t("region.language")}
              value={settings.language}
              columns={2}
              onChange={(language) => update({ language })}
              options={LANGUAGES.map((choice) => ({ value: choice, label: t(`language.${choice}` as MessageKey) }))}
            />
          </SettingRow>

          <SettingRow label={t("region.unit")} hint={t("region.unitHint")}>
            <ChoiceGroup<MeasurementUnit>
              name="unit"
              setting="measurementUnit"
              label={t("region.unit")}
              value={settings.measurementUnit}
              columns={2}
              onChange={(measurementUnit) => update({ measurementUnit })}
              options={MEASUREMENT_UNITS.map((choice) => ({ value: choice, label: t(`unit.${choice}` as MessageKey) }))}
            />
          </SettingRow>
        </SettingsCard>

        <SettingsCard id="notifications" icon={Bell} title={t("notifications.title")} description={t("notifications.hint")}>
          <SettingRow label={t("notifications.email")} hint={t("notifications.emailHint")}>
            <Switch
              setting="emailNotifications"
              label={t("notifications.email")}
              checked={settings.emailNotifications}
              onChange={(emailNotifications) => update({ emailNotifications })}
            />
          </SettingRow>

          <SettingRow label={t("notifications.push")} hint={t("notifications.pushHint")}>
            <Switch
              setting="pushNotifications"
              label={t("notifications.push")}
              checked={settings.pushNotifications}
              onChange={(pushNotifications) => update({ pushNotifications })}
            />
          </SettingRow>

          <p className="flex items-start gap-2 rounded-xl bg-solar/10 px-3 py-2.5 text-[11px] leading-relaxed text-solar ring-1 ring-solar/20">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {t("notifications.none")}
          </p>
        </SettingsCard>

        <SettingsCard id="account" icon={UserRound} title={t("account.title")} description={t("account.hint")}>
          {signedInNow && user ? (
            <>
              <div className="flex items-center gap-3">
                {user.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Clerk serves the avatar from its own CDN; next/image would need a remotePatterns entry for a 40-pixel image.
                  <img
                    src={user.imageUrl}
                    alt=""
                    width={40}
                    height={40}
                    loading="lazy"
                    className="size-10 rounded-full ring-1 ring-white/15"
                  />
                ) : (
                  <span className="grid size-10 place-items-center rounded-full bg-white/8 text-sm font-medium text-white/70 ring-1 ring-white/12">
                    {(user.name ?? "?").slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white/85">{user.name ?? t("account.signedInAs")}</p>
                  <p className="text-xs text-white/45">
                    {t("account.signedInAs")} {provider === "clerk" ? "Clerk" : provider === "supabase" ? "Supabase" : "Kami3D"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="secondary" size="sm">
                  <Link href="/profile">{t("account.manage")}</Link>
                </Button>

                {purge.state === "confirm" ? (
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-white/60">{t("account.confirm")}</span>
                    <Button type="button" variant="danger" size="sm" onClick={deleteMyData}>
                      {t("account.confirmYes")}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setPurge({ state: "idle" })}>
                      {t("account.cancel")}
                    </Button>
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={purge.state === "busy"}
                    onClick={() => setPurge({ state: "confirm" })}
                    title={t("account.deleteHint")}
                  >
                    {t("account.delete")}
                  </Button>
                )}
              </div>

              {purge.message ? (
                <p role="status" className="text-xs text-white/55">
                  {purge.message}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <div>
                <p className="text-sm font-medium text-white/85">{t("account.guestTitle")}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/50">{t("account.guestHint")}</p>
              </div>
              <Button asChild variant="default" size="sm">
                <Link href="/sign-in">{t("account.signIn")}</Link>
              </Button>
            </>
          )}
        </SettingsCard>
      </div>

      <p className="mt-8 text-center text-[11px] text-white/30">
        {source === "database" ? t("save.account") : t("save.browser")}
      </p>
    </div>
  );
}
