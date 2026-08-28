import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { Persister } from '@tanstack/react-query-persist-client';

// Where the durable cache is kept on the web. `cacheStore.native.ts` is the
// Android half, and the bundler picks between them — so the web build never
// imports `expo-sqlite`, and the Android build never imports this.
//
// **That is the reason this file exists, rather than a capability flag.**
// Importing `expo-sqlite` from a module the web build reaches pulls its WASM
// worker into the web bundle, and Metro cannot resolve `wa-sqlite.wasm`. A
// flag cannot help: the bundler resolves imports statically and does not care
// which branch runs. It is the second platform file split in the app and the
// only one that is not about rendering.
//
// On the web, AsyncStorage *is* `localStorage`, which has neither of the
// ceilings that pushed Android onto SQLite — no `CursorWindow`, no 6 MB SQLite
// database. The eviction policy is identical on both: `isPersistable` decides
// what is kept, and it never learns which store is underneath it.

const CACHE_KEY = 'chronicle.query-cache';

export function createCachePersister(): Persister {
  return createAsyncStoragePersister({
    storage: AsyncStorage,
    key: CACHE_KEY,
    // Writing on every cache mutation would mean a full serialise per row that
    // arrives. Five seconds is the persister's own recommended floor, and the
    // SQLite half throttles at the same interval by hand.
    throttleTime: 5000,
  });
}
