"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The controls `/settings` is built from.
 *
 * Every one of them is a real form control underneath — a visually hidden
 * `<input type="radio">` for a group of choices, `<button role="switch">` for a
 * toggle, `<input type="range">` for a volume — rather than a `<div>` with click
 * handlers. That is what makes the panel keyboard-operable and screen-reader
 * correct without a line of code for either, and it is why the styling here is
 * only `peer-checked`-style variants on the native control.
 */

export function SettingsCard({
  id,
  icon: Icon,
  title,
  description,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="glass scroll-mt-24 rounded-[var(--radius-card)] p-5 sm:p-6">
      <header className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/8 text-neon ring-1 ring-white/10">
          <Icon className="size-4" aria-hidden />
        </span>
        <div>
          <h2 id={`${id}-title`} className="font-display text-base font-semibold tracking-tight text-white">
            {title}
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-white/55">{description}</p>
        </div>
      </header>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

export function SettingRow({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6">
      <div className="min-w-0">
        <label htmlFor={htmlFor} className="text-sm font-medium text-white/85">
          {label}
        </label>
        {hint ? <p className="mt-0.5 text-xs leading-relaxed text-white/45">{hint}</p> : null}
      </div>
      <div className="sm:justify-self-end">{children}</div>
    </div>
  );
}

export interface Choice<T extends string | number> {
  value: T;
  label: string;
  /** Drawn inside the option, for the choices that have a natural icon. */
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  /** A colour dot, for the accent picker. */
  swatch?: string;
  title?: string;
}

export function ChoiceGroup<T extends string | number>({
  name,
  label,
  value,
  options,
  onChange,
  columns = 3,
  setting,
}: {
  name: string;
  label: string;
  value: T;
  options: readonly Choice<T>[];
  onChange: (value: T) => void;
  columns?: number;
  /** The preference this group writes, as a stable hook for the browser audit. */
  setting: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      data-setting={setting}
      className="grid gap-1.5 rounded-2xl bg-white/6 p-1.5 ring-1 ring-white/10"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <label
            key={String(option.value)}
            title={option.title}
            className={cn(
              "relative flex cursor-pointer flex-col items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-medium transition-colors",
              active ? "bg-white/14 text-white ring-1 ring-neon/40" : "text-white/60 hover:bg-white/8 hover:text-white",
            )}
          >
            <input
              type="radio"
              name={name}
              value={String(option.value)}
              checked={active}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.swatch ? (
              <span
                aria-hidden
                className="size-4 rounded-full ring-1 ring-white/25"
                style={{ background: option.swatch }}
              />
            ) : null}
            {option.icon ? <option.icon className="size-4" aria-hidden /> : null}
            <span className="text-center leading-tight">{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
  setting,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  setting: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      data-setting={setting}
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-neon" : "bg-white/12",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "block size-4 rounded-full shadow transition-transform",
          checked ? "translate-x-[1.4rem] bg-on-accent" : "translate-x-1 bg-white",
        )}
      />
    </button>
  );
}

export function VolumeSlider({
  id,
  value,
  onChange,
  label,
  setting,
}: {
  id: string;
  value: number;
  onChange: (value: number) => void;
  label: string;
  setting: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        id={id}
        data-setting={setting}
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-40 cursor-pointer appearance-none rounded-full bg-white/12 accent-neon sm:w-48"
      />
      <output htmlFor={id} className="w-10 text-right text-xs tabular-nums text-white/60">
        {value}%
      </output>
    </div>
  );
}
