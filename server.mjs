// Bring Back Jensen: connect a wallet, post on X with the wallet's code, register the wallet for dividends.
// Plain node:http, no framework. Run: npm start
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { getAddress, isAddress, verifyMessage } from "viem";
import { DATA_DIR, loadConfig, loadSecrets, publicConfig } from "./lib/config.mjs";
import { createChain } from "./lib/chain.mjs";
import { codeFor, textHasCode } from "./lib/code.mjs";
import { XError, fetchTweet, parseTweetUrl, textHasHashtag } from "./lib/x.mjs";

const cfg = loadConfig();
const secrets = loadSecrets();
const chain = createChain(cfg);

// SQLite stays closed until a route needs it. Opening it, or importing node:sqlite,
// while the module loads keeps the Vercel invocation pending until it is killed.
let store = null;
let StoreConflict = class extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
};
let registrationsReady = null;
function ensureStore() {
  if (!registrationsReady) {
    registrationsReady = import("./lib/store.mjs")
      .then((mod) => {
        StoreConflict = mod.StoreConflict;
        try {
          store = mod.openStore(join(DATA_DIR, "registrations.db"));
        } catch (e) {
          console.warn("registrations unavailable:", e.message);
          store = null;
        }
        if (!store) console.warn("registrations database is not open");
      })
      .catch((e) => {
        console.warn("registrations unavailable:", e.message);
        store = null;
      });
  }
  return registrationsReady;
}

const SIGN_WINDOW_MS = 10 * 60 * 1000;
const MAX_BODY = 8 * 1024;

class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

const BASE_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "x-frame-options": "DENY",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
};
const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; " +
  "object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

function readPublic(url) {
  try {
    return readFileSync(url);
  } catch (e) {
    console.warn("static file missing:", e.message);
    return null;
  }
}
const PUBLIC_FILES = {
  "index.html": readPublic(new URL("./public/index.html", import.meta.url)),
  "app.js": readPublic(new URL("./public/app.js", import.meta.url)),
  "style.css": readPublic(new URL("./public/style.css", import.meta.url)),
  "favicon.svg": readPublic(new URL("./public/favicon.svg", import.meta.url)),
};
const STATIC = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/app.js": ["app.js", "text/javascript; charset=utf-8"],
  "/style.css": ["style.css", "text/css; charset=utf-8"],
  "/favicon.svg": ["favicon.svg", "image/svg+xml"],
};

// The exact text the wallet signs. The server rebuilds it from the request, so nothing else can be slipped in.
function signText(address, tweetId, issuedAt) {
  return [
    cfg.siteName,
    "分红资格登记 / Dividend eligibility registration",
    `钱包 Wallet: ${address}`,
    `推文 Post: ${tweetId}`,
    `时间 Time: ${issuedAt}`,
    "本签名不花 gas，不授权，不转账。",
    "Signing costs no gas and approves nothing.",
  ].join("\n");
}

function sendJson(res, status, body) {
  res.writeHead(status, { ...BASE_HEADERS, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  if (!String(req.headers["content-type"] || "").startsWith("application/json")) throw new HttpError(415, "BAD_JSON");
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new HttpError(413, "BAD_JSON");
    chunks.push(chunk);
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || typeof body !== "object") throw new Error();
    return body;
  } catch {
    throw new HttpError(400, "BAD_JSON");
  }
}

function parseAddress(value) {
  if (typeof value !== "string" || !isAddress(value, { strict: false })) throw new HttpError(400, "BAD_ADDRESS");
  return getAddress(value);
}

function clientIp(req) {
  if (cfg.trustProxy) {
    const cf = req.headers["cf-connecting-ip"];
    if (typeof cf === "string" && cf) return cf;
    const xff = req.headers["x-forwarded-for"];
    if (typeof xff === "string" && xff) return xff.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "?";
}

// Fixed-window limits per IP and route. RATE_LIMIT_SCALE raises every limit (tests use it).
const LIMIT_SCALE = Math.max(1, Number(process.env.RATE_LIMIT_SCALE) || 1);
const hits = new Map();
function limited(ip, key, base, windowMs) {
  const max = base * LIMIT_SCALE;
  const k = `${key}|${ip}`;
  const now = Date.now();
  let w = hits.get(k);
  if (!w || now - w.start >= windowMs) {
    w = { start: now, n: 0 };
    hits.set(k, w);
  }
  if (hits.size > 200) {
    for (const [hitKey, hit] of hits) if (now - hit.start > 120_000) hits.delete(hitKey);
  }
  w.n += 1;
  return w.n > max;
}

function publicRegistration(row) {
  return { handle: row.handle, tweetUrl: row.tweet_url, createdAt: row.created_at, updatedAt: row.updated_at };
}

async function signatureValid(address, message, signature) {
  try {
    if (await verifyMessage({ address, message, signature })) return true;
  } catch {
    // not a plain EOA signature; try the contract-wallet path below
  }
  try {
    return await chain.client.verifyMessage({ address, message, signature });
  } catch {
    return false;
  }
}

function requireRegistration() {
  if (!secrets.codeSecret || !store) throw new HttpError(503, "NOT_CONFIGURED");
}

async function api(req, res, url) {
  const ip = clientIp(req);
  if (url.pathname !== "/api/config") await ensureStore();
  switch (`${req.method} ${url.pathname}`) {
    case "GET /api/config":
      return sendJson(res, 200, publicConfig(cfg));

    case "GET /api/stats": {
      const pool = await chain.poolBalance().catch(() => null);
      return sendJson(res, 200, { registered: store ? store.count() : 0, pool });
    }

    case "GET /api/wallet": {
      if (limited(ip, "wallet", 60, 60_000)) throw new HttpError(429, "RATE_LIMITED");
      const address = parseAddress(url.searchParams.get("address"));
      const row = store ? store.get(address) : null;
      const balance = await chain.tokenBalance(address).catch((e) => {
        console.warn("balance read failed:", e.shortMessage || e.message);
        return null;
      });
      const min = balance ? chain.minRaw(balance.decimals) : null;
      return sendJson(res, 200, {
        address,
        code: secrets.codeSecret ? codeFor(secrets.codeSecret, address) : null,
        registration: row ? publicRegistration(row) : null,
        balance,
        meetsMin: balance && min !== null ? BigInt(balance.raw) >= min : null,
      });
    }

    case "POST /api/prepare": {
      if (limited(ip, "prepare", 20, 60_000)) throw new HttpError(429, "RATE_LIMITED");
      const body = await readJson(req);
      const address = parseAddress(body.address);
      const tweet = parseTweetUrl(body.tweetUrl);
      if (!tweet) throw new HttpError(400, "BAD_URL");
      const issuedAt = new Date().toISOString();
      return sendJson(res, 200, { message: signText(address, tweet.id, issuedAt), issuedAt, tweetId: tweet.id });
    }

    case "POST /api/register": {
      if (limited(ip, "register", 8, 60_000)) throw new HttpError(429, "RATE_LIMITED");
      requireRegistration();
      const body = await readJson(req);
      const address = parseAddress(body.address);
      const tweet = parseTweetUrl(body.tweetUrl);
      if (!tweet) throw new HttpError(400, "BAD_URL");

      const issuedAt = String(body.issuedAt ?? "");
      const issued = Date.parse(issuedAt);
      if (!Number.isFinite(issued) || new Date(issued).toISOString() !== issuedAt || Math.abs(Date.now() - issued) > SIGN_WINDOW_MS) {
        throw new HttpError(400, "EXPIRED");
      }
      const signature = String(body.signature ?? "");
      if (!/^0x[0-9a-fA-F]{130,4000}$/.test(signature)) throw new HttpError(400, "BAD_SIGNATURE");
      const message = signText(address, tweet.id, issuedAt);
      if (!(await signatureValid(address, message, signature))) throw new HttpError(400, "BAD_SIGNATURE");

      const owner = store.tweetOwner(tweet.id);
      if (owner && owner.toLowerCase() !== address.toLowerCase()) throw new HttpError(409, "TWEET_TAKEN");

      let post;
      try {
        post = await fetchTweet(tweet.id);
      } catch (e) {
        if (e instanceof XError) throw new HttpError(e.code === "TWEET_NOT_FOUND" ? 404 : 502, e.code);
        throw e;
      }
      if (!textHasHashtag(post.text, cfg.eligibility.hashtag)) throw new HttpError(422, "TWEET_MISSING_TAG");
      if (!textHasCode(post.text, codeFor(secrets.codeSecret, address))) throw new HttpError(422, "TWEET_MISSING_CODE");

      let row;
      try {
        row = store.save({
          address,
          handle: post.handle,
          tweetId: tweet.id,
          tweetUrl: `https://x.com/${post.handle}/status/${tweet.id}`,
          tweetText: post.text,
          message,
          signature,
        });
      } catch (e) {
        if (e instanceof StoreConflict) throw new HttpError(409, e.code);
        throw e;
      }
      console.log(`registered ${address} @${post.handle} post ${tweet.id}`);
      return sendJson(res, 200, { ok: true, registration: publicRegistration(row) });
    }

    default:
      throw new HttpError(404, "NOT_FOUND");
  }
}

async function handleRequest(req, res) {
  let url;
  try {
    url = new URL(req.url || "/", "http://localhost");
  } catch {
    return sendJson(res, 400, { error: "BAD_URL" });
  }
  try {
    if (url.pathname.startsWith("/api/")) return await api(req, res, url);
    if (req.method !== "GET" && req.method !== "HEAD") throw new HttpError(405, "NOT_FOUND");
    const entry = STATIC[url.pathname];
    if (!entry) throw new HttpError(404, "NOT_FOUND");
    const [file, type] = entry;
    const body = PUBLIC_FILES[file];
    if (!body) throw new HttpError(404, "NOT_FOUND");
    const headers = { ...BASE_HEADERS, "content-type": type, "cache-control": file === "index.html" ? "no-cache" : "public, max-age=300" };
    if (file === "index.html") headers["content-security-policy"] = CSP;
    res.writeHead(200, headers);
    res.end(req.method === "HEAD" ? undefined : body);
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status === 500) console.error(e);
    if (!res.headersSent) sendJson(res, status, { error: e instanceof HttpError ? e.code : "INTERNAL" });
    else res.end();
  }
}

const server = createServer(handleRequest);

function logReady() {
  console.log(`${cfg.siteName} on http://${cfg.host}:${cfg.port}  (config: ${cfg.file}, data: ${DATA_DIR})`);
  if (cfg.file === "built-in" || cfg.file.endsWith("config.example.json")) {
    console.warn("using the example config - copy config.example.json to config.json and fill it in");
  }
  if (!secrets.codeSecret) console.warn("no code secret: the homepage is up, registration stays off until CODE_SECRET or data/secrets.json is available");
  if (!cfg.token.address) console.warn("token.address is not set: balances are hidden until it is");
  if (cfg.eligibility.minBalance === null) console.warn("eligibility.minBalance is not set: the page shows the threshold as TBA");
}

server.on("error", (e) => {
  console.error(e);
});

// `node server.mjs` listens. Vercel imports this file and calls the exported
// function; it also stubs listen() during that import. A second argument or a
// timer started here never lets that invocation finish, so the platform waits
// about 60s and returns INTERNAL_FUNCTION_INVOCATION_FAILED.
function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return import.meta.url === pathToFileURL(resolve(entry)).href;
  } catch {
    return false;
  }
}
if (isDirectRun()) server.listen(cfg.port, cfg.host, logReady);
else if (process.env.VERCEL) server.listen(cfg.port);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close();
    try {
      if (store) store.close();
    } catch (e) {
      console.warn(e.message);
    }
    process.exit(0);
  });
}

export default handleRequest;
