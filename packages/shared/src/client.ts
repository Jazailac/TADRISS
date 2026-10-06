import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/** Every query/RPC function in this package takes this client as its first argument. */
export type TadrissClient = SupabaseClient<Database>;
