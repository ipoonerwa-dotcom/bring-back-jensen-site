// Chain reads: token balance and decimals, the dividend wallet's BNB, signature checks for contract wallets.
import { createPublicClient, fallback, formatUnits, http, parseAbi, parseUnits } from "viem";
import { bsc, bscTestnet } from "viem/chains";

export const ERC20 = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
]);

export function createChain(cfg) {
  const client = createPublicClient({
    chain: cfg.chain.id === 97 ? bscTestnet : bsc,
    transport: fallback(cfg.chain.rpcUrls.map((url) => http(url, { timeout: 10_000, retryCount: 1 }))),
    batch: { multicall: true },
  });

  let decimals = null;
  const balances = new Map(); // address -> { at, value }
  let pool = null;

  async function tokenDecimals() {
    if (!cfg.token.address) return null;
    if (decimals === null) {
      decimals = Number(await client.readContract({ address: cfg.token.address, abi: ERC20, functionName: "decimals" }));
    }
    return decimals;
  }

  async function tokenBalance(address) {
    if (!cfg.token.address) return null;
    const hit = balances.get(address);
    if (hit && Date.now() - hit.at < 20_000) return hit.value;
    const [dec, raw] = await Promise.all([
      tokenDecimals(),
      client.readContract({ address: cfg.token.address, abi: ERC20, functionName: "balanceOf", args: [address] }),
    ]);
    const value = { raw: raw.toString(), decimals: dec, formatted: formatUnits(raw, dec) };
    if (balances.size > 5000) balances.clear();
    balances.set(address, { at: Date.now(), value });
    return value;
  }

  async function poolBalance() {
    if (!cfg.dividend.wallet) return null;
    if (pool && Date.now() - pool.at < 30_000) return pool.value;
    const wei = await client.getBalance({ address: cfg.dividend.wallet });
    const value = { raw: wei.toString(), formatted: formatUnits(wei, 18) };
    pool = { at: Date.now(), value };
    return value;
  }

  // The minimum holding in raw units, or null while it is not set.
  function minRaw(dec) {
    return cfg.eligibility.minBalance === null || dec === null ? null : parseUnits(cfg.eligibility.minBalance, dec);
  }

  return { client, tokenDecimals, tokenBalance, poolBalance, minRaw };
}
