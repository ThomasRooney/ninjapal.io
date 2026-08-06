import { AuthLoginForm } from '@/components/auth-login-form.tsx'
// import { LoginForm } from '@/components/login-form'
// import { LoginFormMagic } from '@/components/login-form-magic'
import NavMain from '@/components/nav-main.tsx'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/auth/login')({
	component: RouteComponent,
})

function RouteComponent() {
	// When the OAuth authorize flow redirects here it appends the signed
	// authorization query (client_id + sig); after login, resume at the
	// server-side authorize endpoint with that exact query.
	const [oauthRedirect, setOauthRedirect] = useState<string | undefined>()

	useEffect(() => {
		const params = new URLSearchParams(window.location.search)
		if (params.has('client_id') && params.has('sig')) {
			setOauthRedirect(`/api/auth/oauth2/authorize?${params.toString()}`)
		}
	}, [])

	return (
		<div className='flex flex-col flex-grow h-screen w-full items-center justify-center'>
			<NavMain location='auth' />
			<div className='w-full h-full flex flex-col items-center justify-center max-w-md'>
				{/* <LoginForm /> */}
				{/* <LoginFormMagic /> */}
				<AuthLoginForm redirectTo={oauthRedirect} />
			</div>
		</div>
	)
}
