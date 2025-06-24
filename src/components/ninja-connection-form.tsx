'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Schema } from '@/server/db/zero-schema.gen.ts'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useZero } from '@rocicorp/zero/react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, useRouterState, useSearch } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z as zod } from 'zod'

const ninjaConnectionSchema = zod.object({
	username: zod.string().min(1, 'Username is required'),
	password: zod.string().min(1, 'Password is required'),
})

type NinjaConnectionFormData = zod.infer<typeof ninjaConnectionSchema>

export function NinjaConnectionForm() {
	const routerState = useRouterState()
	const user = routerState.matches[0]?.context?.user
	const navigate = useNavigate()
	const search = useSearch({
		from: '/_authed/app/_layout/ninja-connection',
	}) as { mode?: string }
	const z = useZero<Schema>()

	const [connections] = useQuery(z.query.ninjaConnections)

	const connection = connections?.[0]
	const hasConnection = !!connection?.username

	// Form is in edit mode if: no connection yet OR URL has mode=edit
	const isEditing = !hasConnection || search?.mode === 'edit'

	const {
		register,
		handleSubmit,
		formState: { errors },
		setValue,
		reset,
	} = useForm<NinjaConnectionFormData>({
		resolver: zodResolver(ninjaConnectionSchema),
		defaultValues: {
			username: '',
			password: '',
		},
	})

	// Set form values when connection data loads
	useEffect(() => {
		if (connection) {
			reset({
				username: connection.username,
				password: connection.password,
			})
		}
	}, [connection, reset])

	const upsertMutation = useMutation({
		mutationFn: async (data: NinjaConnectionFormData) => {
			await z.mutate.ninjaConnections.upsert({ userId: user?.id, ...data })
		},
		onSuccess: () => {
			// Clear edit mode from URL
			navigate({ search: {} })
		},
	})

	const onSubmit = (data: NinjaConnectionFormData) => {
		upsertMutation.mutate(data)
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle data-testid='ninja-connection-form--card-title'>
					Ninja Account Connection
				</CardTitle>
				<CardDescription>
					{hasConnection
						? 'Your Ninja account is connected. You can update your credentials below.'
						: 'Connect your Ninja account to enable device control.'}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
					<div className='space-y-2'>
						<Label htmlFor='username'>Username</Label>
						<Input
							id='username'
							type='text'
							placeholder='Enter your Ninja username'
							disabled={hasConnection && !isEditing}
							data-testid='ninja-connection-form--username-input'
							{...register('username')}
						/>
						{errors.username && (
							<p className='text-sm text-destructive'>
								{errors.username.message}
							</p>
						)}
					</div>

					<div className='space-y-2'>
						<Label htmlFor='password'>Password</Label>
						<Input
							id='password'
							type='password'
							placeholder='Enter your Ninja password'
							disabled={hasConnection && !isEditing}
							data-testid='ninja-connection-form--password-input'
							{...register('password')}
						/>
						{errors.password && (
							<p className='text-sm text-destructive'>
								{errors.password.message}
							</p>
						)}
					</div>

					{upsertMutation.error && (
						<Alert variant='destructive'>
							<AlertDescription>
								{upsertMutation.error.message}
							</AlertDescription>
						</Alert>
					)}

					{upsertMutation.isSuccess && (
						<Alert>
							<AlertDescription>
								Ninja account credentials saved successfully!
							</AlertDescription>
						</Alert>
					)}

					{connection?.attempts !== undefined &&
						Number(connection.attempts) > 0 && (
							<Alert variant='destructive'>
								<AlertDescription>
									Failed authentication attempts: {connection.attempts}
								</AlertDescription>
							</Alert>
						)}

					<div className='flex gap-2'>
						{hasConnection && !isEditing ? (
							<Button
								type='button'
								onClick={() => navigate({ search: { mode: 'edit' } })}
								variant='outline'
								data-testid='ninja-connection-form--edit-button'
							>
								Edit Credentials
							</Button>
						) : (
							<>
								<Button
									type='submit'
									disabled={upsertMutation.isPending}
									data-testid='ninja-connection-form--submit-button'
								>
									{upsertMutation.isPending && (
										<Loader2 className='mr-2 h-4 w-4 animate-spin' />
									)}
									{hasConnection ? 'Update' : 'Connect'} Account
								</Button>
								{hasConnection && (
									<Button
										type='button'
										variant='outline'
										onClick={() => {
											navigate({ search: {} })
											reset({
												username: connection.username,
												password: connection.password,
											})
										}}
										data-testid='ninja-connection-form--cancel-button'
									>
										Cancel
									</Button>
								)}
							</>
						)}
					</div>
				</form>
			</CardContent>
		</Card>
	)
}
