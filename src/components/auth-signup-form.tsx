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
import { clearUserCache } from '@/lib/user-cache'
import { cn } from '@/lib/utils.ts'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useRouter } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const formSchema = z.object({
	email: z.string().email('Please enter a valid email address'),
	password: z.string().min(8, 'Password must be at least 8 characters'),
})

export function AuthSignupForm({
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
		const { error } = await authClient.signUp.email({
			email: values.email,
			password: values.password,
			name: values.email.split('@')[0],
		})

		if (error) {
			form.setError('root', {
				message: error.message || 'An error occurred during signup',
			})
			return
		}

		// better-auth auto-signs-in after signup — refresh loaders and enter the app
		clearUserCache()
		await router.invalidate()
		await router.navigate({ to: '/app' })
	}

	return (
		<div className={cn('flex w-full flex-col gap-4', className)} {...props}>
			<Card>
				<CardHeader>
					<CardTitle className='text-2xl'>Sign Up</CardTitle>
					<CardDescription>Create an account to get started</CardDescription>
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
												data-testid='signup-email'
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
												data-testid='signup-password'
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
								data-testid='signup-submit'
								disabled={form.formState.isSubmitting}
							>
								Sign Up
							</Button>
						</form>
					</Form>
					<div className='text-center text-sm pt-6'>
						Already have an account?{' '}
						<Link to='/auth/login' className='underline underline-offset-4'>
							Login
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
