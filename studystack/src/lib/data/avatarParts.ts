// A real illustrated character avatar (Bitmoji/Kahoot-style cartoon bust),
// built on top of the "react-nice-avatar" SVG illustration set instead of
// combining emoji glyphs — every part (face, hair, outfit, accessories) is
// genuine layered vector art.

import { genConfig, type AvatarFullConfig, type HairStyle, type ShirtStyle } from "react-nice-avatar";

export type AvatarConfig = Required<AvatarFullConfig>;

export const SKIN_TONES: { id: string; label: string }[] = [
  { id: "#FFDBAC", label: "Fair" },
  { id: "#F1C27D", label: "Light" },
  { id: "#E0AC69", label: "Tan" },
  { id: "#C68642", label: "Medium" },
  { id: "#8D5524", label: "Deep" },
  { id: "#613D30", label: "Dark" },
];

export const HAIR_STYLES: { id: HairStyle; label: string }[] = [
  { id: "normal", label: "Classic" },
  { id: "thick", label: "Thick" },
  { id: "mohawk", label: "Mohawk" },
  { id: "womanLong", label: "Long" },
  { id: "womanShort", label: "Bob" },
];

export const HAIR_COLORS: { id: string; label: string }[] = [
  { id: "#2C2C2C", label: "Black" },
  { id: "#77311D", label: "Brown" },
  { id: "#B58143", label: "Blonde" },
  { id: "#A55728", label: "Auburn" },
  { id: "#EFEFEF", label: "White" },
  { id: "#506AF4", label: "Blue" },
  { id: "#FC909F", label: "Pink" },
];

export const SHIRT_STYLES: { id: ShirtStyle; label: string }[] = [
  { id: "polo", label: "Polo" },
  { id: "hoody", label: "Hoodie" },
  { id: "short", label: "Tee" },
];

export const OUTFIT_COLORS: { id: string; label: string }[] = [
  { id: "#FB923C", label: "Sunset" },
  { id: "#38BDF8", label: "Ocean" },
  { id: "#34D399", label: "Forest" },
  { id: "#A78BFA", label: "Grape" },
  { id: "#FB7185", label: "Rose" },
  { id: "#1E293B", label: "Midnight" },
  { id: "#5EEAD4", label: "Mint" },
  { id: "#FACC15", label: "Sun" },
];

export const GLASSES_STYLES: { id: AvatarConfig["glassesStyle"]; label: string }[] = [
  { id: "none", label: "None" },
  { id: "round", label: "Round" },
  { id: "square", label: "Square" },
];

export const HAT_STYLES: { id: AvatarConfig["hatStyle"]; label: string }[] = [
  { id: "none", label: "None" },
  { id: "beanie", label: "Beanie" },
  { id: "turban", label: "Turban" },
];

export const EYE_STYLES: { id: AvatarConfig["eyeStyle"]; label: string }[] = [
  { id: "circle", label: "Round" },
  { id: "oval", label: "Sleepy" },
  { id: "smile", label: "Happy" },
];

export const MOUTH_STYLES: { id: AvatarConfig["mouthStyle"]; label: string }[] = [
  { id: "smile", label: "Smile" },
  { id: "laugh", label: "Laugh" },
  { id: "peace", label: "Calm" },
];

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  sex: "man",
  faceColor: "#F1C27D",
  earSize: "small",
  hairColor: "#2C2C2C",
  hairStyle: "normal",
  hairColorRandom: false,
  hatColor: "#A78BFA",
  hatStyle: "none",
  eyeStyle: "circle",
  glassesStyle: "none",
  noseStyle: "short",
  mouthStyle: "smile",
  shirtStyle: "polo",
  shirtColor: "#A78BFA",
  bgColor: "#EDE9FE",
  isGradient: false,
  eyeBrowStyle: "up",
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

export function randomAvatarConfig(): AvatarConfig {
  return genConfig() as AvatarConfig;
}

/** Deterministic config for demo/editorial accounts — same seed always renders the same character. */
export function seededAvatarConfig(seed: string): AvatarConfig {
  return genConfig(seed) as AvatarConfig;
}
