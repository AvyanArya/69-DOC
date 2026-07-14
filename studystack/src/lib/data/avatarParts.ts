// A layered, customizable character avatar built entirely from Unicode (no
// image assets): a skin tone + hairstyle combo (real combinable emoji
// sequences), an outfit colour, and an optional accessory badge.

export interface AvatarConfig {
  skin: string; // Unicode skin tone modifier, or "" for default
  hair: string; // hairstyle id
  outfit: string; // outfit id (colour)
  accessory: string; // accessory id, or "none"
}

export const SKIN_TONES: { id: string; label: string; modifier: string }[] = [
  { id: "default", label: "Default", modifier: "" },
  { id: "light", label: "Light", modifier: "\u{1F3FB}" },
  { id: "medium-light", label: "Medium-light", modifier: "\u{1F3FC}" },
  { id: "medium", label: "Medium", modifier: "\u{1F3FD}" },
  { id: "medium-dark", label: "Medium-dark", modifier: "\u{1F3FE}" },
  { id: "dark", label: "Dark", modifier: "\u{1F3FF}" },
];

export const HAIRSTYLES: { id: string; label: string; component: string | null }[] = [
  { id: "plain", label: "Plain", component: null },
  { id: "curly", label: "Curly", component: "\u{1F9B1}" },
  { id: "red", label: "Red", component: "\u{1F9B0}" },
  { id: "white", label: "White", component: "\u{1F9B3}" },
  { id: "bald", label: "Bald", component: "\u{1F9B2}" },
];

export const OUTFITS: { id: string; label: string; gradient: string }[] = [
  { id: "sunset", label: "Sunset", gradient: "from-pink-400 via-orange-400 to-amber-400" },
  { id: "ocean", label: "Ocean", gradient: "from-sky-400 via-blue-500 to-indigo-600" },
  { id: "forest", label: "Forest", gradient: "from-emerald-400 via-teal-500 to-green-600" },
  { id: "grape", label: "Grape", gradient: "from-purple-400 via-violet-500 to-indigo-600" },
  { id: "rose", label: "Rose", gradient: "from-rose-400 via-pink-500 to-fuchsia-600" },
  { id: "midnight", label: "Midnight", gradient: "from-slate-700 via-slate-800 to-gray-900" },
  { id: "mint", label: "Mint", gradient: "from-teal-300 via-emerald-400 to-cyan-500" },
  { id: "sun", label: "Sun", gradient: "from-yellow-300 via-amber-400 to-orange-500" },
];

export const ACCESSORIES: { id: string; label: string; emoji: string | null }[] = [
  { id: "none", label: "None", emoji: null },
  { id: "glasses", label: "Glasses", emoji: "🕶️" },
  { id: "tophat", label: "Top hat", emoji: "🎩" },
  { id: "cap", label: "Cap", emoji: "🧢" },
  { id: "crown", label: "Crown", emoji: "👑" },
  { id: "headphones", label: "Headphones", emoji: "🎧" },
  { id: "bow", label: "Bow", emoji: "🎀" },
];

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  skin: "default",
  hair: "plain",
  outfit: "grape",
  accessory: "none",
};

const AVATAR_PREFIX = "vera-avatar:";

/** Serialise a config into the plain string the app stores as `avatar`. */
export function encodeAvatarConfig(cfg: AvatarConfig): string {
  return AVATAR_PREFIX + JSON.stringify(cfg);
}

/** Parse a stored avatar string; returns null for legacy plain-emoji avatars. */
export function parseAvatarConfig(value: string): AvatarConfig | null {
  if (!value || !value.startsWith(AVATAR_PREFIX)) return null;
  try {
    const parsed = JSON.parse(value.slice(AVATAR_PREFIX.length));
    if (typeof parsed !== "object" || parsed === null) return null;
    return { ...DEFAULT_AVATAR_CONFIG, ...parsed };
  } catch {
    return null;
  }
}

/** Compose the person+skin-tone+hair Unicode sequence for a config. */
export function composeFace(cfg: AvatarConfig): string {
  const base = "\u{1F9D1}"; // 🧑 person
  const skin = SKIN_TONES.find((s) => s.id === cfg.skin)?.modifier ?? "";
  const hair = HAIRSTYLES.find((h) => h.id === cfg.hair)?.component ?? null;
  if (!hair) return base + skin;
  return base + skin + "‍" + hair;
}

export function randomAvatarConfig(): AvatarConfig {
  const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  return {
    skin: pick(SKIN_TONES).id,
    hair: pick(HAIRSTYLES).id,
    outfit: pick(OUTFITS).id,
    accessory: pick(ACCESSORIES).id,
  };
}
