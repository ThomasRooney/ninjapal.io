import { authClient } from '@/lib/auth-client.ts'
import { clearUserCache } from '@/lib/user-cache'
import { useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { Button } from './ui/button.tsx'

// Server function for deleting a user
export const deleteUserFn = createServerFn({ method: 'POST' }).handler(
	async () => {
		// Import server-side modules at runtime
		const [{ auth }, { getSql }, { getRequest }] = await Promise.all([
			import('@/lib/auth'),
			import('@/server/db/client'),
			import('@tanstack/react-start/server'),
		])

		try {
			const request = getRequest()
			const session = request
				? await auth.api.getSession({ headers: request.headers })
				: null
			if (!session?.user) {
				return {
					error: true,
					message: 'No authenticated user found',
				}
			}

			// Delete app data first (devices/history cascade from users via Zero schema)
			const sql = getSql()
			await sql`DELETE FROM public.users WHERE id = ${session.user.id}`

			// Delete the better-auth user (cascades session/account rows)
			await auth.api.deleteUser({
				headers: request?.headers ?? new Headers(),
				body: {},
			})

			return { error: false }
		} catch (error) {
			console.error('Error deleting user:', error)
			return {
				error: true,
				message:
					error instanceof Error ? error.message : 'Failed to delete user',
			}
		}
	},
)

export function AccountDelete() {
	const [isDeleting, setIsDeleting] = useState(false)
	const navigate = useNavigate()

	const deleteUser = async () => {
		if (
			!window.confirm(
				'Are you sure you want to delete your account? This cannot be undone.',
			)
		) {
			return
		}

		try {
			setIsDeleting(true)
			console.log('Deleting user account...')

			// Call the server function to delete the user
			const result = await deleteUserFn()

			if (result.error) {
				throw new Error(result.message || 'Failed to delete account')
			}

			// Sign out client-side after successful deletion
			await authClient.signOut()
			clearUserCache()

			// Navigate to home page after successful deletion
			navigate({ to: '/' })
		} catch (error) {
			console.error('Failed to delete account:', error)
			alert(
				`Failed to delete your account: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		} finally {
			setIsDeleting(false)
		}
	}

	return (
		<Button
			variant='destructive'
			onClick={deleteUser}
			size='sm'
			disabled={isDeleting}
		>
			{isDeleting ? 'Deleting...' : 'Delete Account'}
		</Button>
	)
}
