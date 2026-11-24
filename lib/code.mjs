// Per-wallet verification codes: six characters derived from the address with a server secret,
// so a post carries proof of the wallet without showing the address.
import { createHmac } from "node:crypto";

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // 32 symbols, no 0/O or 1/I

export function codeFor(secret, address) {
  const mac = createHmac("sha256", secret).update(`code:${address.toLowerCase()}`).digest();
  let out = "";
  for (let i = 0; i < 6; i++) out += ALPHABET[mac[i] & 31];
  return out;
}

export function textHasCode(text, code) {
  return new RegExp(`(^|[^A-Za-z0-9])${code}(?![A-Za-z0-9])`, "i").test(text);
}
