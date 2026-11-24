// Dividend snapshot: the token balance of every registered wallet at one block, and each eligible wallet's
// share of a pool, pro rata by balance. Writes CSV and JSON under data/snapshots/.
//
//   npm run snapshot -- --pool 1.5                 (latest block)
//   npm run snapshot -- --pool 1.5 --block 70000000
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { formatEther, formatUnits, parseEther } from "viem";
import { DATA_DIR, loadConfig } from "../lib/config.mjs";
import { ERC20, createChain } from "../lib/chain.mjs";
import { openStore } from "../lib/store.mjs";

const { values } = parseArgs({ options: { pool: { type: "string" }, block: { type: "string" }, out: { type: "string" } } });
if (!values.pool || !/^\d+(\.\d{1,18})?$/.test(values.pool) || (values.block && !/^\d+$/.test(values.block))) {
  console.error("usage: npm run snapshot -- --pool <BNB to share, e.g. 1.5> [--block <number>] [--out <dir>]");
  process.exit(1);
}

const cfg = loadConfig();
if (!cfg.token.address) {
  console.error("config: token.address is not set");
  process.exit(1);
}

const chain = createChain(cfg);
const store = openStore(join(DATA_DIR, "registrations.db"));
const rows = store.all();
store.close();

const block = values.block ? BigInt(values.block) : await chain.client.getBlockNumber();
const decimals = await chain.tokenDecimals();
const min = chain.minRaw(decimals) ?? 0n;
if (cfg.eligibility.minBalance === null) console.warn("eligibility.minBalance is not set: every registered wallet holding any amount counts");
const excluded = new Set(cfg.exclude.map((a) => a.toLowerCase()));

const balances = [];
for (let i = 0; i < rows.length; i += 200) {
  const chunk = rows.slice(i, i + 200);
  const out = await chain.client.multicall({
    contracts: chunk.map((r) => ({ address: cfg.token.address, abi: ERC20, functionName: "balanceOf", args: [r.address] })),
    blockNumber: block,
    allowFailure: false,
  });
  balances.push(...out);
}

const pool = parseEther(values.pool);
const list = rows.map((r, i) => {
  const balance = balances[i];
  let reason = "";
  if (excluded.has(r.address_lc)) reason = "excluded";
  else if (balance === 0n) reason = "no_balance";
  else if (balance < min) reason = "below_min";
  return { address: r.address, handle: r.handle, post: r.tweet_url, balance, eligible: reason === "", reason, share: 0n };
});
const total = list.reduce((sum, x) => (x.eligible ? sum + x.balance : sum), 0n);
let paid = 0n;
if (total > 0n) {
  for (const x of list) {
    if (!x.eligible) continue;
    x.share = (pool * x.balance) / total; // rounded down; the remainder stays in the pool
    paid += x.share;
  }
}

const csv = (cells) => cells.map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replaceAll('"', '""')}"` : String(c))).join(",");
const outDir = values.out || join(DATA_DIR, "snapshots");
mkdirSync(outDir, { recursive: true });
const base = join(outDir, `block-${block}`);

writeFileSync(
  `${base}-all.csv`,
  [csv(["address", "handle", "post", "balance", "eligible", "reason", "share_bnb"])]
    .concat(list.map((x) => csv([x.address, x.handle, x.post, formatUnits(x.balance, decimals), x.eligible ? "yes" : "no", x.reason, formatEther(x.share)])))
    .join("\n") + "\n",
);
writeFileSync(
  `${base}-payouts.csv`,
  [csv(["address", "amount_bnb"])]
    .concat(list.filter((x) => x.share > 0n).map((x) => csv([x.address, formatEther(x.share)])))
    .join("\n") + "\n",
);
writeFileSync(
  `${base}.json`,
  JSON.stringify(
    {
      block: block.toString(),
      chainId: cfg.chain.id,
      token: cfg.token.address,
      decimals,
      minBalance: cfg.eligibility.minBalance,
      pool: formatEther(pool),
      registered: list.length,
      eligible: list.filter((x) => x.eligible).length,
      totalEligibleBalance: formatUnits(total, decimals),
      paid: formatEther(paid),
      remainder: formatEther(pool - paid),
      rows: list.map((x) => ({ ...x, balance: formatUnits(x.balance, decimals), share: formatEther(x.share) })),
    },
    null,
    2,
  ) + "\n",
);

console.log(`block ${block}: ${list.length} registered, ${list.filter((x) => x.eligible).length} eligible`);
console.log(`eligible balance ${formatUnits(total, decimals)}, pool ${formatEther(pool)} BNB, paid ${formatEther(paid)}, remainder ${formatEther(pool - paid)}`);
console.log(`written: ${base}-all.csv, ${base}-payouts.csv, ${base}.json`);
