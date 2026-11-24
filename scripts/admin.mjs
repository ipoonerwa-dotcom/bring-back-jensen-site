// Registration admin on the server itself (there is no admin page or endpoint).
//
//   npm run admin -- count
//   npm run admin -- list
//   npm run admin -- unbind 0xWalletAddress     (frees the wallet, its X account and its post)
import { join } from "node:path";
import { getAddress, isAddress } from "viem";
import { DATA_DIR } from "../lib/config.mjs";
import { openStore } from "../lib/store.mjs";

const [command, arg] = process.argv.slice(2);
const store = openStore(join(DATA_DIR, "registrations.db"));

try {
  if (command === "count") {
    console.log(store.count());
  } else if (command === "list") {
    for (const r of store.all()) console.log([r.address, `@${r.handle}`, r.tweet_url, r.updated_at].join("\t"));
  } else if (command === "unbind" && arg && isAddress(arg, { strict: false })) {
    const removed = store.remove(getAddress(arg));
    console.log(removed ? `removed ${getAddress(arg)}` : "no registration for that address");
  } else {
    console.error("usage: npm run admin -- count | list | unbind <address>");
    process.exitCode = 1;
  }
} finally {
  store.close();
}
