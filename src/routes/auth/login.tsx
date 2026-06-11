import { AuthLoginForm } from '@/components/auth-login-form.tsx'
// import { LoginForm } from '@/components/login-form'
// import { LoginFormMagic } from '@/components/login-form-magic'
import NavMain from '@/components/nav-main.tsx'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/login')({
	component: RouteComponent,
})

function RouteComponent() {
	return (
		<div className='flex flex-col flex-grow h-screen w-full items-center justify-center'>
			<NavMain location='auth' />
			<div className='w-full h-full flex flex-col items-center justify-center max-w-md'>
				{/* <LoginForm /> */}
				{/* <LoginFormMagic /> */}
				<AuthLoginForm />
			</div>
		</div>
	)
}
