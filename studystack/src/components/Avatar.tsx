"use client";

import { useState, type ReactNode } from "react";
import NiceAvatar from "react-nice-avatar";
import {
  EYE_STYLES,
  GLASSES_STYLES,
  HAIR_COLORS,
  HAIR_STYLES,
  HAT_STYLES,
  MOUTH_STYLES,
  OUTFIT_COLORS,
  SHIRT_STYLES,
  SKIN_TONES,
  encodeAvatarConfig,
  parseAvatarConfig,
  randomAvatarConfig,
  type AvatarConfig,
} from "@/lib/data/avatarParts";

/** Drop-in replacement for interpolating a raw avatar string — handles both
 * the illustrated character configs and legacy plain-emoji avatars (which
 * just render through unchanged). Fills whatever fixed-size box wraps it. */
export function AvatarFace({ value, className = "h-full w-full" }: { value: string; className?: string }) {
  const cfg = parseAvatarConfig(value);
  if (!cfg) return <>{value}</>;
  return <NiceAvatar shape="circle" className={className} {...cfg} />;
}

/** Full framed avatar — the illustrated character at a fixed size, for the
 * big identity spots (profile header, sidebar, auth screen, leaderboard). */
export function AvatarBadge({ value, size = "h-12 w-12", className = "" }: { value: string; size?: string; className?: string }) {
  const cfg = parseAvatarConfig(value);
  if (!cfg) {
    return (
      <div className={`grid shrink-0 place-items-center rounded-2xl gradient-purple ${size} ${className}`}>
        <span>{value}</span>
      </div>
    );
  }
  return <NiceAvatar shape="circle" className={`shrink-0 ${size} ${className}`} {...cfg} />;
}

const TABS = [
  { id: "face", label: "Face", emoji: "🙂" },
  { id: "hair", label: "Hair", emoji: "💇" },
  { id: "outfit", label: "Outfit", emoji: "👕" },
  { id: "extras", label: "Extras", emoji: "🕶️" },
] as const;

function Swatch({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`grid h-14 w-14 place-items-center rounded-2xl transition ${
        active ? "ring-2 ring-brand ring-offset-2 ring-offset-card" : "opacity-80 hover:opacity-100"
      }`}
    >
      {children}
    </button>
  );
}

function ColorSwatch({ color, active, onClick, title }: { color: string; active: boolean; onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{ background: color }}
      className={`h-9 w-9 rounded-full transition ${active ? "ring-2 ring-brand ring-offset-2 ring-offset-card" : "opacity-80 hover:opacity-100"}`}
    />
  );
}

/** The Kahoot-style illustrated character builder: pick face, hair, outfit
 * and extras, each option previewed as the real illustrated art, with a
 * live preview and a randomize shortcut. */
export function AvatarBuilder({ config, onChange }: { config: AvatarConfig; onChange: (cfg: AvatarConfig) => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("face");
  const preview = encodeAvatarConfig(config);

  return (
    <div>
      <div className="flex justify-center">
        <AvatarBadge value={preview} size="h-28 w-28" />
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

      {tab === "face" && (
        <div className="mt-3 space-y-3">
          <div>
            <div className="mb-1.5 text-xs font-bold text-muted">Skin tone</div>
            <div className="flex flex-wrap gap-2">
              {SKIN_TONES.map((s) => (
                <ColorSwatch
                  key={s.id}
                  color={s.id}
                  title={s.label}
                  active={config.faceColor === s.id}
                  onClick={() => onChange({ ...config, faceColor: s.id })}
                />
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-xs font-bold text-muted">Expression</div>
            <div className="flex flex-wrap gap-2">
              {EYE_STYLES.map((e) => (
                <Swatch key={e.id} title={e.label} active={config.eyeStyle === e.id} onClick={() => onChange({ ...config, eyeStyle: e.id })}>
                  <NiceAvatar shape="circle" className="h-full w-full" {...config} eyeStyle={e.id} />
                </Swatch>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-xs font-bold text-muted">Mouth</div>
            <div className="flex flex-wrap gap-2">
              {MOUTH_STYLES.map((m) => (
                <Swatch key={m.id} title={m.label} active={config.mouthStyle === m.id} onClick={() => onChange({ ...config, mouthStyle: m.id })}>
                  <NiceAvatar shape="circle" className="h-full w-full" {...config} mouthStyle={m.id} />
                </Swatch>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "hair" && (
        <div className="mt-3 space-y-3">
          <div>
            <div className="mb-1.5 text-xs font-bold text-muted">Style</div>
            <div className="flex flex-wrap gap-2">
              {HAIR_STYLES.map((h) => (
                <Swatch key={h.id} title={h.label} active={config.hairStyle === h.id} onClick={() => onChange({ ...config, hairStyle: h.id })}>
                  <NiceAvatar shape="circle" className="h-full w-full" {...config} hairStyle={h.id} hatStyle="none" />
                </Swatch>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-xs font-bold text-muted">Colour</div>
            <div className="flex flex-wrap gap-2">
              {HAIR_COLORS.map((c) => (
                <ColorSwatch
                  key={c.id}
                  color={c.id}
                  title={c.label}
                  active={config.hairColor === c.id}
                  onClick={() => onChange({ ...config, hairColor: c.id })}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "outfit" && (
        <div className="mt-3 space-y-3">
          <div>
            <div className="mb-1.5 text-xs font-bold text-muted">Style</div>
            <div className="flex flex-wrap gap-2">
              {SHIRT_STYLES.map((s) => (
                <Swatch key={s.id} title={s.label} active={config.shirtStyle === s.id} onClick={() => onChange({ ...config, shirtStyle: s.id })}>
                  <NiceAvatar shape="circle" className="h-full w-full" {...config} shirtStyle={s.id} />
                </Swatch>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-xs font-bold text-muted">Colour</div>
            <div className="flex flex-wrap gap-2">
              {OUTFIT_COLORS.map((c) => (
                <ColorSwatch
                  key={c.id}
                  color={c.id}
                  title={c.label}
                  active={config.shirtColor === c.id}
                  onClick={() => onChange({ ...config, shirtColor: c.id })}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "extras" && (
        <div className="mt-3 space-y-3">
          <div>
            <div className="mb-1.5 text-xs font-bold text-muted">Glasses</div>
            <div className="flex flex-wrap gap-2">
              {GLASSES_STYLES.map((g) => (
                <Swatch key={g.id} title={g.label} active={config.glassesStyle === g.id} onClick={() => onChange({ ...config, glassesStyle: g.id })}>
                  <NiceAvatar shape="circle" className="h-full w-full" {...config} glassesStyle={g.id} />
                </Swatch>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-xs font-bold text-muted">Hat</div>
            <div className="flex flex-wrap gap-2">
              {HAT_STYLES.map((h) => (
                <Swatch key={h.id} title={h.label} active={config.hatStyle === h.id} onClick={() => onChange({ ...config, hatStyle: h.id })}>
                  <NiceAvatar shape="circle" className="h-full w-full" {...config} hatStyle={h.id} />
                </Swatch>
              ))}
            </div>
          </div>
        </div>
      )}

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
