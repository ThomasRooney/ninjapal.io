import { useZero } from '@/hooks/use-typed-zero'
import { authClient } from '@/lib/auth-client.ts'

export function useSyncUserZero() {
	const z = useZero()

	const syncUser = async () => {
		const { data: session } = await authClient.getSession()
		const user = session?.user
		if (user) {
			// id comes from authData.sub inside the mutator
			await z.mutate.users.upsert({
				email: user.email ?? '',
				name: user.name ?? user.email ?? 'Unknown User',
			})
		}
	}

	return { syncUser }
}
