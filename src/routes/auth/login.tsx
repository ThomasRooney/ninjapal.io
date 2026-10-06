import { AuthLoginForm } from '@/components/auth-login-form.tsx'
import NavMain from '@/components/nav-main.tsx'
import { loginContext } from '@/lib/login-context'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/auth/login')({
	component: RouteComponent,
})

function RouteComponent() {
	// When the OAuth authorize flow redirects here it appends the signed
	// authorization query (client_id + sig); after login, resume at the
	// server-side authorize endpoint with that exact query.
	const [context, setContext] = useState(() => loginContext(''))

	useEffect(() => {
		setContext(loginContext(window.location.search))
	}, [])

	return (
		<div className='flex flex-col flex-grow h-screen w-full items-center justify-center'>
			<NavMain location='auth' />
			<div className='w-full h-full flex flex-col items-center justify-center max-w-md'>
				<AuthLoginForm {...context} />
			</div>
		</div>
	)
}
