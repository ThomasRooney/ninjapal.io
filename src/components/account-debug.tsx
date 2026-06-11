import { Button } from '@/components/ui/button.tsx'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog.tsx'
import { useZero } from '@/hooks/use-typed-zero'
import { authClient } from '@/lib/auth-client.ts'
import { useQuery } from '@rocicorp/zero/react'
import { BugIcon } from 'lucide-react'

/**
 * Debug dialog: shows the better-auth session and the user's Zero-synced row
 * side by side, to diagnose auth/sync mismatches.
 */
export function AccountDebug() {
	const { data: session, isPending } = authClient.useSession()
	const z = useZero()
	const [zeroUser] = useQuery(
		z.query.users.where('id', session?.user?.id ?? '').one(),
	)

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant='outline' size='xs' className='px-2'>
					<BugIcon className='h-4 w-4' />
					Debug
				</Button>
			</DialogTrigger>
			<DialogContent className='max-w-2xl'>
				<DialogHeader>
					<DialogTitle>Auth Debug</DialogTitle>
					<DialogDescription>
						better-auth session vs Zero-synced user row
					</DialogDescription>
				</DialogHeader>
				<div className='grid gap-4 text-xs font-mono'>
					<div>
						<p className='font-semibold mb-1'>Session</p>
						<pre className='bg-muted p-2 rounded overflow-auto max-h-48'>
							{isPending ? 'Loading…' : JSON.stringify(session, null, 2)}
						</pre>
					</div>
					<div>
						<p className='font-semibold mb-1'>Zero users row</p>
						<pre className='bg-muted p-2 rounded overflow-auto max-h-48'>
							{JSON.stringify(zeroUser ?? null, null, 2)}
						</pre>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
