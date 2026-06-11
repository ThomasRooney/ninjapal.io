import { getSql } from '@/server/db/client'

/**
 * Delete a user from Zero when they delete their auth account.
 * This ensures all user data is cleaned up properly in Zero Sync.
 */
export async function deleteUserFromZero(userId: string): Promise<void> {
	console.log('🗑️ Deleting user from Zero DB:', userId)

	try {
		const sql = getSql()
		await sql`DELETE FROM public.users WHERE id = ${userId}`
		console.log('✅ User deleted from Zero:', userId)
	} catch (error) {
		console.error('❌ Failed to delete user from Zero:', userId, error)
		// We don't throw here to avoid preventing the auth deletion
	}
}
