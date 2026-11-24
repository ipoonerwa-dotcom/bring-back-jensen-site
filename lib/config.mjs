// Loads config.json, otherwise config.example.json, otherwise a built-in copy of the example.
// A missing file or a read-only disk must not stop the homepage from starting.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getAddress, isAddress } from "viem";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const DATA_DIR = process.env.DATA_DIR || join(ROOT, "data");

function fail(message) {
  throw new Error(`config: ${message}`);
}

function optAddress(value, field) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !isAddress(value, { strict: false })) fail(`${field} is not an address`);
  return getAddress(value);
}

function optDecimal(value, field) {
  if (value === null || value === undefined || value === "") return null;
  const s = String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(s)) fail(`${field} must be a plain decimal number such as "100000"`);
  return s;
}

// Same content as config.example.json. Used when that file is not in the deployment bundle.
const BUILTIN_CONFIG = {
  siteName: "Bring Back Jensen",
  port: 3260,
  host: "127.0.0.1",
  trustProxy: false,
  chain: {
    id: 56,
    rpcUrls: [
      "https://bsc-dataseed.bnbchain.org",
      "https://bsc-dataseed1.binance.org",
      "https://bsc-rpc.publicnode.com",
    ],
    explorer: "https://bscscan.com",
  },
  token: { name: "TOKEN NAME", symbol: "TICKER", address: null },
  eligibility: {
    minBalance: null,
    hashtag: "#BringBackJensen",
    tweetTemplate: {
      zh: "支持黄仁勋回归英伟达！#BringBackJensen ${symbol}\n验证码 {code}",
      en: "Bring Jensen back to NVIDIA! #BringBackJensen ${symbol}\nCode {code}",
    },
  },
  dividend: { taxSharePct: null, wallet: null },
  links: { x: null, telegram: null, flap: null },
  exclude: [],
  i18nOverrides: { zh: {}, en: {} },
};

function optHttpsUrl(value, field) {
  if (value === null || value === undefined || value === "") return null;
  let url;
  try {
    url = new URL(String(value));
  } catch {
    fail(`${field} is not a URL`);
  }
  if (url.protocol !== "https:") fail(`${field} must start with https://`);
  return url.toString();
}

function readConfigFile(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

export function loadConfig() {
  const local = join(ROOT, "config.json");
  const example = join(ROOT, "config.example.json");
  let file;
  let raw;
  if (process.env.CONFIG_FILE) {
    file = process.env.CONFIG_FILE;
    raw = readConfigFile(file);
  } else if (existsSync(local)) {
    file = local;
    raw = readConfigFile(file);
  } else if (existsSync(example)) {
    file = example;
    try {
      raw = readConfigFile(file);
    } catch (e) {
      console.warn("config.example.json unreadable, using built-in config:", e.message);
      raw = BUILTIN_CONFIG;
      file = "built-in";
    }
  } else {
    raw = BUILTIN_CONFIG;
    file = "built-in";
  }

  const chainId = Number(raw.chain?.id ?? 56);
  if (chainId !== 56 && chainId !== 97) fail("chain.id must be 56 (BSC) or 97 (BSC testnet)");
  const rpcUrls = Array.isArray(raw.chain?.rpcUrls) ? raw.chain.rpcUrls.map(String).filter(Boolean) : [];
  if (!rpcUrls.length) fail("chain.rpcUrls is empty");

  const hashtag = String(raw.eligibility?.hashtag || "#BringBackJensen").trim();
  if (!/^#[\p{L}\p{N}_]+$/u.test(hashtag)) fail("eligibility.hashtag must look like #Word");
  const tweetTemplate = {
    zh: String(raw.eligibility?.tweetTemplate?.zh || ""),
    en: String(raw.eligibility?.tweetTemplate?.en || ""),
  };
  for (const [lang, text] of Object.entries(tweetTemplate)) {
    if (text && !text.includes("{code}")) fail(`eligibility.tweetTemplate.${lang} must contain {code}`);
  }
  if (!tweetTemplate.zh && !tweetTemplate.en) fail("eligibility.tweetTemplate needs at least one language");

  const pct = raw.dividend?.taxSharePct;
  const taxSharePct = pct === null || pct === undefined || pct === "" ? null : Number(pct);
  if (taxSharePct !== null && !(taxSharePct >= 0 && taxSharePct <= 100)) fail("dividend.taxSharePct must be 0-100");

  return {
    file,
    siteName: String(raw.siteName || "Bring Back Jensen"),
    port: Number(process.env.PORT || raw.port || 3260),
    host: process.env.HOST || (process.env.VERCEL ? "0.0.0.0" : raw.host || "127.0.0.1"),
    trustProxy: process.env.VERCEL ? true : Boolean(raw.trustProxy),
    chain: {
      id: chainId,
      rpcUrls,
      explorer: String(raw.chain?.explorer || (chainId === 56 ? "https://bscscan.com" : "https://testnet.bscscan.com")),
    },
    token: {
      name: String(raw.token?.name || ""),
      symbol: String(raw.token?.symbol || ""),
      address: optAddress(raw.token?.address, "token.address"),
    },
    eligibility: {
      minBalance: optDecimal(raw.eligibility?.minBalance, "eligibility.minBalance"),
      hashtag,
      tweetTemplate,
    },
    dividend: {
      taxSharePct,
      wallet: optAddress(raw.dividend?.wallet, "dividend.wallet"),
    },
    links: {
      x: optHttpsUrl(raw.links?.x, "links.x"),
      telegram: optHttpsUrl(raw.links?.telegram, "links.telegram"),
      flap: optHttpsUrl(raw.links?.flap, "links.flap"),
    },
    exclude: (Array.isArray(raw.exclude) ? raw.exclude : []).map((a, i) => optAddress(a, `exclude[${i}]`)).filter(Boolean),
    i18nOverrides: raw.i18nOverrides && typeof raw.i18nOverrides === "object" ? raw.i18nOverrides : {},
  };
}

// What the page may see. Nothing secret lives in the config, but keep the surface explicit.
export function publicConfig(cfg) {
  return {
    siteName: cfg.siteName,
    chain: { id: cfg.chain.id, explorer: cfg.chain.explorer },
    token: cfg.token,
    eligibility: cfg.eligibility,
    dividend: cfg.dividend,
    links: cfg.links,
    i18nOverrides: cfg.i18nOverrides,
  };
}

// The code secret makes each wallet's verification code unguessable from the address alone.
// It is created once and kept in data/secrets.json; changing it changes every code.
// On a read-only disk (Vercel) there is no secret and registration stays off. The homepage still starts.
export function loadSecrets() {
  if (process.env.CODE_SECRET) return { codeSecret: process.env.CODE_SECRET };
  const file = join(DATA_DIR, "secrets.json");
  try {
    if (existsSync(file)) {
      const saved = JSON.parse(readFileSync(file, "utf8"));
      if (typeof saved.codeSecret === "string" && saved.codeSecret.length >= 32) return saved;
      fail(`${file} has no usable codeSecret`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("config:")) throw e;
    console.warn("could not read secrets:", e.message);
    return { codeSecret: null };
  }
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    const secrets = { codeSecret: randomBytes(32).toString("hex") };
    writeFileSync(file, JSON.stringify(secrets, null, 2) + "\n", { mode: 0o600 });
    return secrets;
  } catch (e) {
    console.warn("could not create secrets:", e.message);
    return { codeSecret: null };
  }
}
