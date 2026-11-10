import { env } from '../config/env.js';
import { LocalPersistentStore } from './localStore.js';
import type { MediPathStore } from './storeTypes.js';
import { SupabaseStore } from './supabaseStore.js';

export * from './storeTypes.js';
export { LocalPersistentStore } from './localStore.js';
export { SupabaseStore } from './supabaseStore.js';

export function createStore(customLocalPath?: string): MediPathStore {
  if (env.persistenceMode === 'supabase' && !customLocalPath) {
    return new SupabaseStore();
  }
  return new LocalPersistentStore(customLocalPath);
}

