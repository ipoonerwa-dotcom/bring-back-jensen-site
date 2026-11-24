// Reads a public post through X's oEmbed endpoint (no API key, no login).
const OEMBED_ENDPOINT = process.env.OEMBED_ENDPOINT || "https://publish.x.com/oembed";
const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;
const STATUS_RE =
  /^(?:https?:\/\/)?(?:(?:www|mobile|m)\.)?(?:x|twitter)\.com\/(?:#!\/)?(?:[A-Za-z0-9_]{1,15}|i\/web)\/status(?:es)?\/(\d{1,25})(?:[/?#].*)?$/i;

export class XError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

// Accepts x.com / twitter.com status links, with or without query strings. Returns { id } or null.
export function parseTweetUrl(input) {
  if (typeof input !== "string") return null;
  const m = STATUS_RE.exec(input.trim());
  return m ? { id: m[1] } : null;
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", mdash: "—", ndash: "–", hellip: "…" };

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, e) => {
    if (e[0] === "#") {
      const cp = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : all;
    }
    return ENTITIES[e.toLowerCase()] ?? all;
  });
}

// The post body is the first <p> of the oEmbed blockquote; links (hashtags, cashtags) keep their text.
export function textFromHtml(html) {
  const m = /<p\b[^>]*>([\s\S]*?)<\/p>/i.exec(html);
  const inner = m ? m[1] : "";
  return decodeEntities(inner.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")).trim();
}

function handleFromAuthorUrl(url) {
  try {
    const handle = new URL(url).pathname.split("/").filter(Boolean)[0] ?? "";
    return HANDLE_RE.test(handle) ? handle : null;
  } catch {
    return null;
  }
}

export async function fetchTweet(id) {
  const query = new URLSearchParams({ url: `https://x.com/i/status/${id}`, omit_script: "1", dnt: "true", hide_thread: "true", lang: "en" });
  for (let attempt = 0; attempt < 2; attempt++) {
    let res;
    try {
      res = await fetch(`${OEMBED_ENDPOINT}?${query}`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
    } catch {
      continue; // network trouble: one more try
    }
    if (res.status === 400 || res.status === 403 || res.status === 404) throw new XError("TWEET_NOT_FOUND");
    if (!res.ok) continue;
    const body = await res.json().catch(() => null);
    const handle = body && typeof body.author_url === "string" ? handleFromAuthorUrl(body.author_url) : null;
    if (!handle || typeof body.html !== "string") throw new XError("X_UNAVAILABLE");
    return { handle, text: textFromHtml(body.html) };
  }
  throw new XError("X_UNAVAILABLE");
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// "#Tag" anywhere, any case, not as the prefix of a longer tag.
export function textHasHashtag(text, hashtag) {
  const tag = escapeRe(hashtag.replace(/^#/, ""));
  return new RegExp(`(^|[^\\p{L}\\p{N}_])#${tag}(?![\\p{L}\\p{N}_])`, "iu").test(text);
}
