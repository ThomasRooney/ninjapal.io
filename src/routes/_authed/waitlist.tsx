import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { authClient } from '@/lib/auth-client'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Flame } from 'lucide-react'

export const Route = createFileRoute('/_authed/waitlist')({
	beforeLoad: ({ context }) => {
		// Whitelisted users don't belong here
		if (context.user?.whitelisted || context.user?.isAdmin) {
			throw redirect({ to: '/app' })
		}
	},
	component: WaitlistPage,
})

function WaitlistPage() {
	const navigate = useNavigate()
	return (
		<div className='min-h-screen bg-background flex items-center justify-center p-6'>
			<Card className='max-w-md w-full'>
				<CardContent className='pt-8 pb-8 text-center space-y-4'>
					<Flame className='h-10 w-10 mx-auto text-red-600' />
					<h1 className='text-2xl font-bold' data-testid='waitlist-heading'>
						You're on the list 🔥
					</h1>
					<p className='text-muted-foreground text-sm'>
						PitMinder is in a small private beta while we tune the AI pitmaster.
						Your account is created — we'll email you the moment a spot opens
						up.
					</p>
					<Button
						variant='outline'
						onClick={async () => {
							await authClient.signOut()
							navigate({ to: '/' })
						}}
						data-testid='waitlist-signout'
					>
						Sign out
					</Button>
				</CardContent>
			</Card>
		</div>
	)
}
