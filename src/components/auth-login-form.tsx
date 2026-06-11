import { Button } from '@/components/ui/button.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card.tsx'
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form.tsx'
import { Input } from '@/components/ui/input.tsx'
import { authClient } from '@/lib/auth-client.ts'
import { cn } from '@/lib/utils.ts'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useRouter } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const formSchema = z.object({
	email: z.string().email('Please enter a valid email address'),
	password: z.string().min(8, 'Password must be at least 8 characters'),
})

export function AuthLoginForm({
	className,
	...props
}: React.ComponentPropsWithoutRef<'div'>) {
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: '',
			password: '',
		},
	})

	const router = useRouter()

	async function onSubmit(values: z.infer<typeof formSchema>) {
		const { error } = await authClient.signIn.email({
			email: values.email,
			password: values.password,
		})

		if (error) {
			form.setError('root', {
				message: error.message || 'Invalid email or password',
			})
			return
		}

		// Session cookie is set — re-run loaders so route context picks up the user
		await router.invalidate()
		await router.navigate({ to: '/app' })
	}

	return (
		<div className={cn('flex w-full flex-col gap-4', className)} {...props}>
			<Card>
				<CardHeader>
					<CardTitle className='text-2xl'>Login</CardTitle>
					<CardDescription>
						Enter your email below to login to your account
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className='flex flex-col gap-6'
						>
							<FormField
								control={form.control}
								name='email'
								render={({ field }) => (
									<FormItem>
										<FormLabel>Email</FormLabel>
										<FormControl>
											<Input
												placeholder='m@example.com'
												type='email'
												data-testid='login-email'
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name='password'
								render={({ field }) => (
									<FormItem>
										<FormLabel>Password</FormLabel>
										<FormControl>
											<Input
												type='password'
												data-testid='login-password'
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							{form.formState.errors.root && (
								<div className='text-sm text-destructive'>
									{form.formState.errors.root.message}
								</div>
							)}

							<Button
								type='submit'
								className='w-full rounded'
								data-testid='login-submit'
								disabled={form.formState.isSubmitting}
							>
								Login
							</Button>
						</form>
					</Form>
					<div className='text-center text-sm pt-6'>
						Don&apos;t have an account?{' '}
						<Link to='/auth/signup' className='underline underline-offset-4'>
							Sign up
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
