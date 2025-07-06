import { getSupabaseBrowserClient } from '@/lib/supabase-client.ts'
import { useZero } from '@/hooks/use-typed-zero'

export function useSyncUserZero() {
	const z = useZero()

	const syncUser = async () => {
		const supabase = getSupabaseBrowserClient()

		const {
			data: { user },
		} = await supabase.auth.getUser()
		if (user) {
			await z.mutate.users.upsert({
				id: user.id,
				email: user.email ?? '',
				name: user.user_metadata?.name ?? user.email ?? 'Unknown User',
			})
		}
	}

	return { syncUser }
}
