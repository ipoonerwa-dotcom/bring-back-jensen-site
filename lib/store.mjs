// Registrations in SQLite (node:sqlite). One row per wallet; an X account and a post can each back one wallet.
import { DatabaseSync } from "node:sqlite";

export class StoreConflict extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

export function openStore(file) {
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec(`CREATE TABLE IF NOT EXISTS registrations (
    address_lc     TEXT PRIMARY KEY,
    address        TEXT NOT NULL,
    handle         TEXT NOT NULL,
    handle_lc      TEXT NOT NULL UNIQUE,
    tweet_id       TEXT NOT NULL UNIQUE,
    tweet_url      TEXT NOT NULL,
    tweet_text     TEXT NOT NULL,
    signed_message TEXT NOT NULL,
    signature      TEXT NOT NULL,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
  )`);

  const q = {
    byAddress: db.prepare("SELECT * FROM registrations WHERE address_lc = ?"),
    byHandle: db.prepare("SELECT * FROM registrations WHERE handle_lc = ?"),
    byTweet: db.prepare("SELECT * FROM registrations WHERE tweet_id = ?"),
    count: db.prepare("SELECT COUNT(*) AS n FROM registrations"),
    all: db.prepare("SELECT * FROM registrations ORDER BY created_at, address_lc"),
    remove: db.prepare("DELETE FROM registrations WHERE address_lc = ?"),
    insert: db.prepare(`INSERT INTO registrations
      (address_lc, address, handle, handle_lc, tweet_id, tweet_url, tweet_text, signed_message, signature, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
    update: db.prepare(`UPDATE registrations SET
      handle = ?, handle_lc = ?, tweet_id = ?, tweet_url = ?, tweet_text = ?, signed_message = ?, signature = ?, updated_at = ?
      WHERE address_lc = ?`),
  };

  return {
    get: (address) => q.byAddress.get(address.toLowerCase()) ?? null,
    tweetOwner: (tweetId) => q.byTweet.get(tweetId)?.address ?? null,
    count: () => Number(q.count.get().n),
    all: () => q.all.all(),
    remove: (address) => Number(q.remove.run(address.toLowerCase()).changes),

    // Insert or replace this wallet's post. The checks and the write run in one transaction.
    save(rec) {
      const addressLc = rec.address.toLowerCase();
      const handleLc = rec.handle.toLowerCase();
      db.exec("BEGIN IMMEDIATE");
      try {
        const byHandle = q.byHandle.get(handleLc);
        if (byHandle && byHandle.address_lc !== addressLc) throw new StoreConflict("HANDLE_TAKEN");
        const byTweet = q.byTweet.get(rec.tweetId);
        if (byTweet && byTweet.address_lc !== addressLc) throw new StoreConflict("TWEET_TAKEN");
        const now = new Date().toISOString();
        if (q.byAddress.get(addressLc)) {
          q.update.run(rec.handle, handleLc, rec.tweetId, rec.tweetUrl, rec.tweetText, rec.message, rec.signature, now, addressLc);
        } else {
          q.insert.run(addressLc, rec.address, rec.handle, handleLc, rec.tweetId, rec.tweetUrl, rec.tweetText, rec.message, rec.signature, now, now);
        }
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
      return q.byAddress.get(addressLc);
    },

    close: () => db.close(),
  };
}
