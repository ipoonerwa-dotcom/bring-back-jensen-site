// Front end: wallet connection (EIP-6963 or the injected provider), the post intent, and registration.
// No libraries; the page only talks to this site's /api and to the wallet.

const I18N = {
  zh: {
    "common.copy": "复制",
    "common.copied": "已复制",
    "common.copyFailed": "复制失败，请手动复制。",

    "hero.eyebrow": "社区 meme · ${symbol}",
    "hero.lede": "持有 {symbol}，发推支持黄仁勋回归英伟达，登记你的分红资格。交易税的一部分，按持币比例分给已登记的地址。",

    "stats.registered": "已登记地址",
    "stats.min": "持币门槛",
    "stats.share": "分红占税",
    "stats.pool": "当前分红池",
    "stats.tba": "待定",

    "s1.title": "连接钱包",
    "s1.body": "支持 MetaMask、OKX、币安钱包等。只读取地址和持币量，不会发起任何交易。",
    "s1.connect": "连接钱包",
    "s1.switch": "换钱包",
    "s1.address": "地址",
    "s1.balance": "持币",
    "s1.injected": "浏览器钱包",
    "s1.noWallet": "没有检测到钱包。请在钱包 App 的内置浏览器里打开本页，或者安装浏览器钱包插件。",
    "s1.noAccount": "钱包没有返回地址，请解锁后再试。",
    "s1.noToken": "代币还没上线，上线后这里会显示你的持币量。",
    "s1.meets": "已达到持币门槛。",
    "s1.below": "还没达到门槛（{min} {symbol}）。有没有资格，看每期快照时的持币量。",
    "s1.loading": "读取中…",

    "s2.title": "一键发推",
    "s2.body": "文案已经带上话题和你钱包的专属验证码。可以在发推框里加上自己的话，话题和验证码别删。",
    "s2.locked": "先连接钱包，生成你的专属验证码。",
    "s2.post": "打开 X 发推",
    "s2.copy": "复制文案",
    "s2.after": "发完推，复制推文链接，回到这里贴进第 3 步。用 X App 发的话，可以先复制文案，再到 App 里粘贴。",
    "s2.copiedAfter": "文案已复制。发完推，复制推文链接，回到这里贴进第 3 步。",

    "s3.title": "贴链接登记",
    "s3.body": "把推文链接贴到这里。钱包会请你签一段文字确认身份：不花 gas，不授权，不转账。",
    "s3.placeholder": "https://x.com/你的账号/status/…",
    "s3.submit": "签名并登记",
    "s3.resubmit": "改用这条推文登记",
    "s3.signing": "请在钱包里确认签名…",
    "s3.checking": "正在核验推文…",
    "s3.success": "登记成功。",
    "s3.registered": "已登记",

    "rules.title": "规则",
    "rules.q1": "分红怎么分？",
    "rules.a1": "每一期取一个快照区块，在已登记、并且持币达到门槛的地址之间，按持币量比例分配。登记时不要求已经持币。",
    "rules.q2": "开多个钱包有用吗？",
    "rules.a2": "没用。按持币比例分，币拆到几个钱包，分到的总数不变。另外，一个 X 账号只能绑一个钱包，一条推文也只能登记一次。",
    "rules.q3": "签名安全吗？",
    "rules.a3": "登记只签一段文字，不花 gas，不授权，不转账。本站不会索要助记词或私钥，也不会请你授权代币。",
    "rules.q4": "会公开什么？",
    "rules.a4": "登记会把你的 X 账号和钱包地址关联起来，用来核对分红资格。推文要保持公开。",
    "rules.q5": "分红从哪来？",
    "rules.a5": "来自代币的交易税：一部分进营销，一部分进分红。没有交易就没有税，分到多少取决于交易量，不保证任何收益。",

    "foot.disclaimer": "社区 meme 项目，与英伟达公司（NVIDIA）及黄仁勋本人没有任何关联，也未获得他们的认可。",
    "foot.risk": "meme 币价格波动极大，可能归零。本站内容不构成投资建议。",

    "err.BAD_ADDRESS": "钱包地址不对。",
    "err.BAD_URL": "这不是推文链接。链接应该长这样：https://x.com/账号/status/一串数字",
    "err.BAD_JSON": "请求格式不对，请刷新页面再试。",
    "err.EXPIRED": "签名超时了，请重新点一次登记。",
    "err.BAD_SIGNATURE": "签名核验没通过，请用当前连接的钱包重新签。",
    "err.TWEET_NOT_FOUND": "找不到这条推文。确认它是公开的、没有删除，账号也没有设成受保护。",
    "err.TWEET_MISSING_TAG": "推文里没有找到话题 {hashtag}。",
    "err.TWEET_MISSING_CODE": "推文里没有找到你的验证码 {code}。请用第 2 步生成的文案发推。",
    "err.HANDLE_TAKEN": "这个 X 账号已经绑定了另一个钱包。一个 X 账号只能绑一个钱包。",
    "err.TWEET_TAKEN": "这条推文已经被另一个钱包登记过了。",
    "err.RATE_LIMITED": "操作太频繁，请等一分钟再试。",
    "err.X_UNAVAILABLE": "暂时连不上 X 来核验推文，请过几分钟再试。",
    "err.USER_REJECTED": "你取消了签名。",
    "err.SIGN_FAILED": "钱包签名失败，请重试。",
    "err.CONNECT_REJECTED": "你拒绝了连接请求。",
    "err.CONNECT_FAILED": "连接钱包失败，请重试。",
    "err.NETWORK": "网络出错，请检查网络后重试。",
    "err.INTERNAL": "服务器出错了，请稍后再试。",
    "err.CONFIG": "暂时连不上服务器，请刷新页面。",
  },
  en: {
    "common.copy": "Copy",
    "common.copied": "Copied",
    "common.copyFailed": "Copy failed. Please copy it by hand.",

    "hero.eyebrow": "Community meme · ${symbol}",
    "hero.lede": "Hold {symbol}, post on X to support Jensen Huang's return to NVIDIA, and register your wallet. Part of the trading tax is shared among registered wallets in proportion to their holdings.",

    "stats.registered": "Registered wallets",
    "stats.min": "Minimum holding",
    "stats.share": "Tax to dividends",
    "stats.pool": "Dividend pool",
    "stats.tba": "TBA",

    "s1.title": "Connect your wallet",
    "s1.body": "MetaMask, OKX, Binance Wallet and others. Only your address and holding are read; nothing is sent.",
    "s1.connect": "Connect wallet",
    "s1.switch": "Switch wallet",
    "s1.address": "Address",
    "s1.balance": "Holding",
    "s1.injected": "Browser wallet",
    "s1.noWallet": "No wallet found. Open this page in your wallet app's browser, or install a browser wallet.",
    "s1.noAccount": "The wallet returned no address. Unlock it and try again.",
    "s1.noToken": "The token is not live yet. Your holding will show here once it is.",
    "s1.meets": "You meet the minimum holding.",
    "s1.below": "Below the minimum ({min} {symbol}). Eligibility is checked against each round's snapshot.",
    "s1.loading": "Loading…",

    "s2.title": "Post on X",
    "s2.body": "The text already carries the hashtag and your wallet's code. Add your own words if you like; keep the hashtag and the code.",
    "s2.locked": "Connect your wallet first to get your code.",
    "s2.post": "Open X to post",
    "s2.copy": "Copy text",
    "s2.after": "After posting, copy the post's link and paste it in step 3. Posting from the X app? Copy the text first and paste it there.",
    "s2.copiedAfter": "Text copied. After posting, copy the post's link and paste it in step 3.",

    "s3.title": "Register with the link",
    "s3.body": "Paste the link to your post. Your wallet will ask you to sign a short text: no gas, no approval, no transfer.",
    "s3.placeholder": "https://x.com/yourname/status/…",
    "s3.submit": "Sign and register",
    "s3.resubmit": "Register this post instead",
    "s3.signing": "Confirm the signature in your wallet…",
    "s3.checking": "Checking your post…",
    "s3.success": "Registered.",
    "s3.registered": "Registered",

    "rules.title": "Rules",
    "rules.q1": "How are dividends shared?",
    "rules.a1": "Each round takes a snapshot block and splits the round among registered wallets that meet the minimum holding, in proportion to their holdings. You don't need to hold when you register.",
    "rules.q2": "Do extra wallets help?",
    "rules.a2": "No. Shares follow holdings, so splitting tokens across wallets changes nothing. One X account can back one wallet, and each post registers once.",
    "rules.q3": "Is signing safe?",
    "rules.a3": "Registration signs a short text only: no gas, no approval, no transfer. This site never asks for your seed phrase or private key, and never asks you to approve a token.",
    "rules.q4": "What becomes public?",
    "rules.a4": "Registration links your X account to your wallet address so eligibility can be checked. Keep the post public.",
    "rules.q5": "Where do dividends come from?",
    "rules.a5": "From the token's trading tax: part goes to marketing, part to dividends. No trading means no tax; amounts depend on volume and nothing is guaranteed.",

    "foot.disclaimer": "A community meme project. Not affiliated with, or endorsed by, NVIDIA or Jensen Huang.",
    "foot.risk": "Meme tokens are extremely volatile and can go to zero. Nothing here is investment advice.",

    "err.BAD_ADDRESS": "That wallet address is not valid.",
    "err.BAD_URL": "That is not a post link. It should look like https://x.com/name/status/123…",
    "err.BAD_JSON": "Bad request. Refresh the page and try again.",
    "err.EXPIRED": "The signature expired. Press register again.",
    "err.BAD_SIGNATURE": "The signature did not verify. Sign again with the connected wallet.",
    "err.TWEET_NOT_FOUND": "Post not found. Make sure it is public, not deleted, and the account is not protected.",
    "err.TWEET_MISSING_TAG": "The post does not contain {hashtag}.",
    "err.TWEET_MISSING_CODE": "The post does not contain your code {code}. Post the text from step 2.",
    "err.HANDLE_TAKEN": "This X account already backs another wallet. One X account, one wallet.",
    "err.TWEET_TAKEN": "This post is already registered to another wallet.",
    "err.RATE_LIMITED": "Too many tries. Wait a minute and try again.",
    "err.X_UNAVAILABLE": "Can't reach X to check the post right now. Try again in a few minutes.",
    "err.USER_REJECTED": "You cancelled the signature.",
    "err.SIGN_FAILED": "The wallet could not sign. Try again.",
    "err.CONNECT_REJECTED": "You declined the connection.",
    "err.CONNECT_FAILED": "Could not connect the wallet. Try again.",
    "err.NETWORK": "Network error. Check your connection and try again.",
    "err.INTERNAL": "Server error. Try again later.",
    "err.CONFIG": "Can't reach the server. Refresh the page.",
  },
};

const TWEET_RE =
  /^(?:https?:\/\/)?(?:(?:www|mobile|m)\.)?(?:x|twitter)\.com\/(?:#!\/)?(?:[A-Za-z0-9_]{1,15}|i\/web)\/status(?:es)?\/\d{1,25}(?:[/?#].*)?$/i;

const $ = (id) => document.getElementById(id);

const state = {
  cfg: null,
  lang: "zh",
  providers: [], // EIP-6963 announcements: { info, provider }
  provider: null,
  address: null,
  wallet: null, // the /api/wallet answer for state.address
  busy: false,
};

const prefs = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      // storage blocked: preferences just are not remembered
    }
  },
};

class ApiError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

// ---------- text ----------

function vars() {
  const c = state.cfg;
  return {
    symbol: (c && c.token.symbol) || "TOKEN",
    hashtag: (c && c.eligibility.hashtag) || "#BringBackJensen",
    min: c && c.eligibility.minBalance ? fmtAmount(c.eligibility.minBalance, 4) : "",
    code: (state.wallet && state.wallet.code) || "",
  };
}

function has(key) {
  return key in I18N[state.lang] || key in I18N.zh;
}

function t(key, extra = {}) {
  const raw = I18N[state.lang][key] ?? I18N.zh[key] ?? key;
  const v = { ...vars(), ...extra };
  return raw.replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m));
}

function fmtAmount(value, maxFrac = 2) {
  if (value === null || value === undefined) return "—";
  const [int, frac = ""] = String(value).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const kept = frac.slice(0, maxFrac).replace(/0+$/, "");
  return kept ? `${grouped}.${kept}` : grouped;
}

function shortAddress(address) {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";
}

function fmtTime(iso) {
  try {
    return new Date(iso).toLocaleString(state.lang === "zh" ? "zh-CN" : "en-US", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function setFigure(el, value, unit) {
  el.textContent = value;
  if (unit) {
    const small = document.createElement("small");
    small.textContent = unit;
    el.append(small);
  }
}

function note(id, text, kind) {
  const el = $(id);
  el.textContent = text;
  el.hidden = false;
  el.classList.toggle("is-error", kind === "error");
  el.classList.toggle("is-ok", kind === "ok");
}

function hideNote(id) {
  $(id).hidden = true;
}

function errorText(e) {
  let code = "NETWORK";
  if (e && typeof e.code === "number") code = e.code === 4001 ? "USER_REJECTED" : "SIGN_FAILED";
  else if (e && e.code === "ACTION_REJECTED") code = "USER_REJECTED";
  else if (e && typeof e.code === "string") code = e.code;
  return has(`err.${code}`) ? t(`err.${code}`) : t("err.INTERNAL");
}

// ---------- api ----------

async function request(path, init) {
  let res;
  try {
    res = await fetch(path, init);
  } catch {
    throw new ApiError("NETWORK");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error || "INTERNAL");
  return body;
}

const getJson = (path) => request(path, { headers: { accept: "application/json" } });
const postJson = (path, payload) =>
  request(path, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(payload) });

// ---------- render ----------

function renderText() {
  document.documentElement.lang = state.lang === "zh" ? "zh-CN" : "en";
  for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll("[data-i18n-placeholder]")) el.placeholder = t(el.dataset.i18nPlaceholder);
  $("lang-toggle").textContent = state.lang === "zh" ? "EN" : "中文";
}

function renderConfig() {
  const c = state.cfg;
  if (!c) return;
  document.title = c.siteName;
  $("site-name").textContent = c.siteName;
  for (const key of ["x", "telegram", "flap"]) {
    const a = $(`link-${key}`);
    if (c.links[key]) {
      a.href = c.links[key];
      a.hidden = false;
    }
  }
  if (c.token.address) {
    $("ca-row").hidden = false;
    $("ca-link").textContent = c.token.address;
    $("ca-link").href = `${c.chain.explorer}/token/${c.token.address}`;
  }
  if (c.eligibility.minBalance) setFigure($("stat-min"), fmtAmount(c.eligibility.minBalance, 4), c.token.symbol);
  else $("stat-min").textContent = t("stats.tba");
  if (c.dividend.taxSharePct !== null) {
    $("stat-share-box").hidden = false;
    $("stat-share").textContent = `${c.dividend.taxSharePct}%`;
  }
}

function tweetText() {
  const tpl = state.cfg.eligibility.tweetTemplate;
  const text = state.lang === "en" ? tpl.en || tpl.zh : tpl.zh || tpl.en;
  return text.replaceAll("{symbol}", state.cfg.token.symbol || "TOKEN").replaceAll("{code}", state.wallet.code || "");
}

function renderWallet() {
  const w = state.wallet;
  const connected = Boolean(state.address);
  const reg = w && w.registration;

  $("btn-connect").hidden = connected;
  $("btn-switch").hidden = !connected;
  $("wallet-info").hidden = !connected;
  if (connected) {
    $("wallet-address").textContent = shortAddress(state.address);
    $("wallet-address").title = state.address;
    if (!w) $("wallet-balance").textContent = t("s1.loading");
    else if (w.balance) $("wallet-balance").textContent = `${fmtAmount(w.balance.formatted)} ${state.cfg.token.symbol}`;
    else $("wallet-balance").textContent = "—";
    if (w) {
      if (!state.cfg.token.address) note("wallet-note", t("s1.noToken"));
      else if (w.meetsMin === true) note("wallet-note", t("s1.meets"), "ok");
      else if (w.meetsMin === false) note("wallet-note", t("s1.below"));
      else hideNote("wallet-note");
    }
  }

  const ready = Boolean(w);
  const preview = $("tweet-preview");
  preview.textContent = ready ? tweetText() : t("s2.locked");
  preview.classList.toggle("is-locked", !ready);
  $("btn-tweet").disabled = !ready;
  $("btn-copy").disabled = !ready;

  $("tweet-url").disabled = !ready || state.busy;
  $("btn-register").disabled = !ready || state.busy;
  $("btn-register").textContent = t(reg ? "s3.resubmit" : "s3.submit");
  $("registration").hidden = !reg;
  if (reg) {
    $("registration-link").textContent = `@${reg.handle}`;
    $("registration-link").href = reg.tweetUrl;
    $("registration-time").textContent = fmtTime(reg.updatedAt);
  }

  $("step-1").classList.toggle("is-current", !connected);
  $("step-1").classList.toggle("is-done", connected);
  for (const id of ["step-2", "step-3"]) {
    $(id).classList.toggle("is-current", connected && !reg);
    $(id).classList.toggle("is-done", Boolean(reg));
  }
}

function renderAll() {
  renderText();
  renderConfig();
  renderWallet();
}

async function loadStats() {
  try {
    const s = await getJson("/api/stats");
    $("stat-registered").textContent = fmtAmount(String(s.registered), 0);
    if (s.pool) {
      $("stat-pool-box").hidden = false;
      setFigure($("stat-pool"), fmtAmount(s.pool.formatted, 4), "BNB");
    }
  } catch {
    // stats are decoration; leave the last values
  }
}

// ---------- wallet ----------

window.addEventListener("eip6963:announceProvider", (event) => {
  const d = event.detail;
  if (!d || !d.info || !d.provider || typeof d.info.uuid !== "string") return;
  if (!state.providers.some((p) => p.info.uuid === d.info.uuid)) state.providers.push(d);
});
window.dispatchEvent(new Event("eip6963:requestProvider"));

function walletList() {
  if (state.providers.length) return state.providers;
  if (window.ethereum) return [{ info: { uuid: "injected", name: t("s1.injected"), icon: "" }, provider: window.ethereum }];
  return [];
}

function onAccountsChanged(accounts) {
  setAccount(accounts && accounts[0]);
}

function renderPicker(list) {
  const box = $("wallet-picker");
  box.replaceChildren();
  for (const w of list) {
    const button = document.createElement("button");
    button.type = "button";
    if (typeof w.info.icon === "string" && w.info.icon.startsWith("data:image/")) {
      const img = document.createElement("img");
      img.src = w.info.icon;
      img.alt = "";
      button.append(img);
    }
    button.append(document.createTextNode(w.info.name || "Wallet"));
    button.addEventListener("click", () => useWallet(w));
    box.append(button);
  }
  box.hidden = false;
}

async function connect() {
  const list = walletList();
  if (!list.length) return note("wallet-note", t("s1.noWallet"), "error");
  if (list.length === 1) return useWallet(list[0]);
  renderPicker(list);
}

async function switchWallet() {
  const list = walletList();
  if (list.length > 1) return renderPicker(list);
  if (!list.length) return;
  try {
    await list[0].provider.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] });
  } catch (e) {
    if (e && e.code === 4001) return;
  }
  useWallet(list[0]);
}

async function useWallet(w, silent = false) {
  $("wallet-picker").hidden = true;
  if (!silent) hideNote("wallet-note");
  try {
    const accounts = await w.provider.request({ method: silent ? "eth_accounts" : "eth_requestAccounts" });
    if (!accounts || !accounts[0]) {
      if (!silent) note("wallet-note", t("s1.noAccount"), "error");
      return;
    }
    if (state.provider !== w.provider) {
      if (state.provider && state.provider.removeListener) state.provider.removeListener("accountsChanged", onAccountsChanged);
      state.provider = w.provider;
      if (state.provider.on) state.provider.on("accountsChanged", onAccountsChanged);
    }
    prefs.set("wallet", w.info.uuid);
    await setAccount(accounts[0]);
  } catch (e) {
    if (!silent) note("wallet-note", t(e && e.code === 4001 ? "err.CONNECT_REJECTED" : "err.CONNECT_FAILED"), "error");
  }
}

async function setAccount(address) {
  hideNote("register-note");
  if (!address) {
    state.address = null;
    state.wallet = null;
    hideNote("wallet-note");
    prefs.set("wallet", null);
    renderWallet();
    return;
  }
  state.address = address;
  state.wallet = null;
  renderWallet();
  try {
    const w = await getJson(`/api/wallet?address=${encodeURIComponent(address)}`);
    if (state.address !== address) return; // the account changed while loading
    state.wallet = w;
  } catch (e) {
    note("wallet-note", errorText(e), "error");
  }
  renderWallet();
}

// ---------- actions ----------

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}

function openPost() {
  if (!state.wallet) return;
  const url = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText())}`;
  const win = window.open(url, "_blank");
  if (win) win.opener = null;
  else location.href = url;
  note("tweet-note", t("s2.after"));
}

async function copyPost() {
  if (!state.wallet) return;
  const ok = await copyText(tweetText());
  note("tweet-note", ok ? t("s2.copiedAfter") : t("common.copyFailed"), ok ? "ok" : "error");
}

async function copyCa(event) {
  const button = event.currentTarget;
  const ok = await copyText(state.cfg.token.address);
  button.textContent = ok ? t("common.copied") : t("common.copyFailed");
  setTimeout(() => {
    button.textContent = t("common.copy");
  }, 1500);
}

function utf8Hex(text) {
  return `0x${Array.from(new TextEncoder().encode(text), (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function setBusy(busy) {
  state.busy = busy;
  renderWallet();
}

async function register(event) {
  event.preventDefault();
  if (state.busy || !state.wallet || !state.provider) return;
  const tweetUrl = $("tweet-url").value.trim();
  if (!TWEET_RE.test(tweetUrl)) return note("register-note", t("err.BAD_URL"), "error");
  const address = state.address;
  setBusy(true);
  try {
    const prep = await postJson("/api/prepare", { address, tweetUrl });
    note("register-note", t("s3.signing"));
    const signature = await state.provider.request({ method: "personal_sign", params: [utf8Hex(prep.message), address] });
    note("register-note", t("s3.checking"));
    const out = await postJson("/api/register", { address, tweetUrl, issuedAt: prep.issuedAt, signature });
    if (state.address === address && state.wallet) state.wallet = { ...state.wallet, registration: out.registration };
    $("tweet-url").value = "";
    note("register-note", t("s3.success"), "ok");
    loadStats();
  } catch (e) {
    note("register-note", errorText(e), "error");
  } finally {
    setBusy(false);
  }
}

function toggleLang() {
  state.lang = state.lang === "zh" ? "en" : "zh";
  prefs.set("lang", state.lang);
  // Notes were written in the old language; the wallet note is redrawn below when it applies.
  for (const id of ["wallet-note", "tweet-note", "register-note"]) hideNote(id);
  renderAll();
}

// ---------- start ----------

async function init() {
  const saved = prefs.get("lang");
  state.lang = saved === "zh" || saved === "en" ? saved : (navigator.language || "").toLowerCase().startsWith("zh") ? "zh" : "en";

  $("lang-toggle").addEventListener("click", toggleLang);
  $("btn-connect").addEventListener("click", connect);
  $("btn-switch").addEventListener("click", switchWallet);
  $("btn-tweet").addEventListener("click", openPost);
  $("btn-copy").addEventListener("click", copyPost);
  $("ca-copy").addEventListener("click", copyCa);
  $("register-form").addEventListener("submit", register);

  try {
    state.cfg = await getJson("/api/config");
  } catch {
    renderText();
    $("btn-connect").disabled = true;
    note("wallet-note", t("err.CONFIG"), "error");
    return;
  }
  for (const lang of ["zh", "en"]) Object.assign(I18N[lang], (state.cfg.i18nOverrides && state.cfg.i18nOverrides[lang]) || {});
  renderAll();
  loadStats();
  setInterval(loadStats, 60_000);

  // Reconnect quietly if this browser already allowed a wallet here.
  setTimeout(() => {
    const last = prefs.get("wallet");
    if (!last) return;
    const list = walletList();
    const w = list.find((x) => x.info.uuid === last) || (last === "injected" ? list[0] : null);
    if (w) useWallet(w, true);
  }, 300);
}

init();
