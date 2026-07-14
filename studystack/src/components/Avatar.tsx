"use client";

import { useState } from "react";
import {
  ACCESSORIES,
  HAIRSTYLES,
  OUTFITS,
  SKIN_TONES,
  composeFace,
  encodeAvatarConfig,
  parseAvatarConfig,
  randomAvatarConfig,
  type AvatarConfig,
} from "@/lib/data/avatarParts";

/** Drop-in replacement for interpolating a raw avatar string — handles both
 * the new layered character configs and legacy plain-emoji avatars (which
 * just render through unchanged), including the small accessory badge. */
export function AvatarFace({ value, accessoryClassName = "text-[0.55em]" }: { value: string; accessoryClassName?: string }) {
  const cfg = parseAvatarConfig(value);
  if (!cfg) return <>{value}</>;

  const face = composeFace(cfg);
  const accessory = ACCESSORIES.find((a) => a.id === cfg.accessory)?.emoji;

  return (
    <span className="relative inline-block leading-none">
      {face}
      {accessory && (
        <span className={`absolute -right-1 -top-1 ${accessoryClassName}`} aria-hidden>
          {accessory}
        </span>
      )}
    </span>
  );
}

/** Full framed avatar — a circle tinted with the character's outfit colour,
 * for the big identity spots (profile header, sidebar, auth screen). */
export function AvatarBadge({ value, size = "h-12 w-12 text-2xl", className = "" }: { value: string; size?: string; className?: string }) {
  const cfg = parseAvatarConfig(value);
  const gradient = cfg ? OUTFITS.find((o) => o.id === cfg.outfit)?.gradient ?? OUTFITS[0].gradient : null;

  return (
    <div
      className={`grid shrink-0 place-items-center rounded-2xl ${size} ${
        gradient ? `bg-gradient-to-br ${gradient}` : "gradient-purple"
      } ${className}`}
    >
      <AvatarFace value={value} accessoryClassName="text-[0.4em]" />
    </div>
  );
}

const TABS = [
  { id: "skin", label: "Skin", emoji: "🎨" },
  { id: "hair", label: "Hair", emoji: "💇" },
  { id: "outfit", label: "Outfit", emoji: "👕" },
  { id: "accessory", label: "Accessory", emoji: "🕶️" },
] as const;

/** The Kahoot-style character builder: pick skin tone, hairstyle, outfit
 * colour and an accessory, with a live preview and a randomize shortcut. */
export function AvatarBuilder({ config, onChange }: { config: AvatarConfig; onChange: (cfg: AvatarConfig) => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("skin");

  return (
    <div>
      <div className="flex justify-center">
        <AvatarBadge value={encodeAvatarConfig(config)} size="h-24 w-24 text-5xl" />
      </div>

      <div className="mt-4 grid grid-cols-4 gap-1 rounded-2xl bg-canvas p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-xl py-2 text-xs font-bold transition ${
              tab === t.id ? "bg-card text-ink card-shadow" : "text-muted hover:text-ink"
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {tab === "skin" &&
          SKIN_TONES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange({ ...config, skin: s.id })}
              title={s.label}
              className={`grid h-12 w-12 place-items-center rounded-2xl text-2xl transition ${
                config.skin === s.id ? "gradient-purple ring-2 ring-brand" : "bg-canvas hover:bg-soft"
              }`}
            >
              {composeFace({ ...config, skin: s.id, hair: "plain" })}
            </button>
          ))}

        {tab === "hair" &&
          HAIRSTYLES.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => onChange({ ...config, hair: h.id })}
              title={h.label}
              className={`grid h-12 w-12 place-items-center rounded-2xl text-2xl transition ${
                config.hair === h.id ? "gradient-purple ring-2 ring-brand" : "bg-canvas hover:bg-soft"
              }`}
            >
              {composeFace({ ...config, hair: h.id })}
            </button>
          ))}

        {tab === "outfit" &&
          OUTFITS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange({ ...config, outfit: o.id })}
              title={o.label}
              className={`h-12 w-12 rounded-2xl bg-gradient-to-br transition ${o.gradient} ${
                config.outfit === o.id ? "ring-2 ring-brand ring-offset-2 ring-offset-card" : "opacity-80 hover:opacity-100"
              }`}
            />
          ))}

        {tab === "accessory" &&
          ACCESSORIES.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onChange({ ...config, accessory: a.id })}
              title={a.label}
              className={`grid h-12 w-12 place-items-center rounded-2xl text-xl transition ${
                config.accessory === a.id ? "gradient-purple ring-2 ring-brand" : "bg-canvas hover:bg-soft"
              }`}
            >
              {a.emoji ?? "🚫"}
            </button>
          ))}
      </div>

      <button
        type="button"
        onClick={() => onChange(randomAvatarConfig())}
        className="mt-4 w-full rounded-2xl bg-canvas py-2.5 text-sm font-bold text-ink hover:bg-soft"
      >
        🎲 Randomize
      </button>
    </div>
  );
}
