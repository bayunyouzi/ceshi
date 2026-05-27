import { tagLibrary } from './tagLibrary';

export type SecurityLevel = 'safe' | 'creative' | 'nsfw';

export function getRandomTags(category: keyof typeof tagLibrary, count: number = 3, securityLevel: SecurityLevel = 'safe') {
  const lib = tagLibrary[category] as any;
  if (!lib) return "";
  let tags: string[] = [];
  if (Array.isArray(lib)) {
    tags = lib;
  } else if (lib && typeof lib === "object") {
    const safeTags = Array.isArray(lib.safe) ? lib.safe : [];
    const creativeTags = Array.isArray(lib.creative) ? lib.creative : [];
    const nsfwTags = Array.isArray(lib.nsfw) ? lib.nsfw : [];
    if (securityLevel === "safe") tags = safeTags;
    if (securityLevel === "creative") tags = [...safeTags, ...creativeTags];
    if (securityLevel === "nsfw") tags = [...safeTags, ...creativeTags, ...nsfwTags];
  }
  if (!Array.isArray(tags) || tags.length === 0) return "";
  const shuffled = [...tags].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).join(", ");
}

export const getChinaDayRange = () => {
  const nowMs = Date.now();
  const chinaMs = nowMs + 8 * 60 * 60 * 1000;
  const chinaDate = new Date(chinaMs);
  const y = chinaDate.getUTCFullYear();
  const m = chinaDate.getUTCMonth();
  const d = chinaDate.getUTCDate();
  const dayStartUtcMs = Date.UTC(y, m, d) - 8 * 60 * 60 * 1000;
  return {
    start: new Date(dayStartUtcMs),
    end: new Date(dayStartUtcMs + 24 * 60 * 60 * 1000)
  };
};

export const normalizeEndpoint = (raw: string, fallback: string = "") => {
  if (!raw || typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  try {
    const url = new URL(trimmed);
    if (url.pathname === "/" || url.pathname === "") {
      url.pathname = "/v1/chat/completions";
    }
    return url.toString();
  } catch {
    return trimmed || fallback;
  }
};
