// e2e/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Supabase URL or Service Role Key is not defined in .env.test");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * A placeholder for a function to reset the database state before each test.
 * You will need to implement this based on your schema.
 * For example, it could truncate all your tables.
 */
export async function resetDatabase() {
  // Example: await supabaseAdmin.rpc('reset_db');
  // Or: await supabaseAdmin.from('profiles').delete().neq('id', '');
  console.log('Database reset logic needs to be implemented.');
}