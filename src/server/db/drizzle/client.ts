import { createDb, getDatabasePool } from '@/server/db/db'
import * as schema from '@/server/db/schema'

// Get database URL from environment
const databaseUrl =
	process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL

if (!databaseUrl) {
	throw new Error('Database URL not configured')
}

// Create and export the drizzle instance
export const drizzle = await createDb(databaseUrl, schema)

// Export the pool for direct access if needed
export const pool = getDatabasePool(databaseUrl)
