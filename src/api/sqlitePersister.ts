import * as SQLite from 'expo-sqlite';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

// The Android store for the durable cache.
//
// AsyncStorage cannot hold this cache safely. Three measured facts, in the
// installed 2.2.0:
//
//   - the Android database is capped at 6 MB by default
//     (`android/config.gradle:90`, `long dbSizeInMB = 6L`);
//   - this project cannot raise it — there is no `android/` directory and no
//     `gradle.properties`, because the app is managed and runs in Expo Go, so
//     it gets the stock 6 MB;
//   - and the real ceiling is lower still. `useNextStorage` defaults to false,
//     so reads come back through a `Cursor`, and the persister writes the
//     whole cache as **one row**. Android's `CursorWindow` is 2 MB by default,
//     and a single row past that throws `Row too big to fit into CursorWindow`
//     when it is read back.
//
// The persisted blob measured 42 KB for one 19-article edition with its
// bodies — about 2.2 KB per article — so ordinary reading stays in the low
// hundreds of kilobytes. But the 90-day rule is the only thing bounding a
// reader who opens articles across many editions, and the whole archive as it
// stands is roughly 2.5 MB. That crosses the row ceiling, and it crosses it by
// growing slowly over three months rather than all at once, which is the
// failure that arrives without warning.
//
// SQLite through `expo-sqlite` has no such row limit and no 6 MB database cap.
// It is bundled in Expo Go, so the dev workflow does not change.
//
// **Nothing about the eviction policy moves.** `isPersistable` stays exactly as
// it is — durable prefix, within 90 days, never the `latest` sentinel. This
// swaps the drawer, not what goes in it.

const DATABASE = 'chronicle-cache.db';
const KEY = 'query-cache';

/** The persister's own recommended floor. Writing on every cache mutation
 *  would mean a full serialise per row that arrives. */
const THROTTLE_MS = 5000;

let handle: Promise<SQLite.SQLiteDatabase> | null = null;

function database(): Promise<SQLite.SQLiteDatabase> {
  if (!handle) {
    handle = SQLite.openDatabaseAsync(DATABASE).then(async (db) => {
      // WAL: the write is a background throttle tick and must not block a read
      // the reader is waiting on.
      await db.execAsync(
        'PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);',
      );
      return db;
    });
  }
  return handle;
}

/**
 * Coalesce writes to at most one per interval, keeping the last.
 *
 * `createAsyncStoragePersister` throttles for us; a hand-rolled persister has
 * to do it itself, and forgetting is not a visible bug — it is a serialise of
 * the entire cache on every row that arrives, which shows up only as a phone
 * getting warm.
 *
 * Trailing edge, so the *final* state of a burst is what lands on disk rather
 * than the first.
 */
function throttle<T>(run: (value: T) => Promise<void>, ms: number): (value: T) => void {
  let pending: T | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (value: T) => {
    pending = value;
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      const next = pending;
      pending = null;
      if (next !== null) void run(next);
    }, ms);
  };
}

export function createSqlitePersister(): Persister {
  const write = throttle<PersistedClient>(async (client) => {
    try {
      const db = await database();
      await db.runAsync(
        'INSERT INTO cache (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;',
        KEY,
        JSON.stringify(client),
      );
    } catch {
      // A cache that cannot be written is a cache miss next launch, which the
      // app already handles. It is not worth a screen.
    }
  }, THROTTLE_MS);

  return {
    // Returns immediately: the write is throttled and nothing awaits it, which
    // is the same contract the async-storage persister has.
    persistClient: async (client) => {
      write(client);
    },

    restoreClient: async () => {
      try {
        const db = await database();
        const row = await db.getFirstAsync<{ value: string }>(
          'SELECT value FROM cache WHERE key = ?;',
          KEY,
        );
        if (!row?.value) return undefined;
        return JSON.parse(row.value) as PersistedClient;
      } catch {
        // A blob that will not parse is discarded rather than half-restored.
        return undefined;
      }
    },

    removeClient: async () => {
      try {
        const db = await database();
        await db.runAsync('DELETE FROM cache WHERE key = ?;', KEY);
      } catch {
        // Nothing to do and nothing to say.
      }
    },
  };
}
