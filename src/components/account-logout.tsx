import { authClient } from '@/lib/auth-client.ts'
import { clearUserCache } from '@/lib/user-cache'
import { useNavigate } from '@tanstack/react-router'
import { LogOutIcon } from 'lucide-react'
import { Button } from './ui/button.tsx'

export function AccountLogout() {
	const navigate = useNavigate()

	const handleLogout = async () => {
		await authClient.signOut()
		clearUserCache()
		navigate({ to: '/' })
	}

	return (
		<Button variant='outline' onClick={handleLogout} size='xs' className='px-2'>
			<LogOutIcon className='h-4 w-4' />
			Log Out
		</Button>
	)
}
