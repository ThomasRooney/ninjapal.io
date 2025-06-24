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
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouterState } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const ninjaConnectionSchema = z.object({
	username: z.string().min(1, 'Username is required'),
	password: z.string().min(1, 'Password is required'),
})

type NinjaConnectionFormData = z.infer<typeof ninjaConnectionSchema>

export function NinjaConnectionForm() {
	const [isEditing, setIsEditing] = useState(false)
	const routerState = useRouterState()
	const user = routerState.matches[0]?.context?.user

	// Query existing connection data
	const { data: connection } = useQuery({
		queryKey: ['ninja-connection', user?.id],
		queryFn: async () => {
			if (!user?.id) return null
			const response = await fetch(`/api/ninja-connections/${user.id}`)
			if (!response.ok) return null
			return response.json()
		},
		enabled: !!user?.id,
	})

	const {
		register,
		handleSubmit,
		formState: { errors },
		setValue,
	} = useForm<NinjaConnectionFormData>({
		resolver: zodResolver(ninjaConnectionSchema),
		defaultValues: {
			username: connection?.username || '',
			password: connection?.password || '',
		},
	})

	// Set form values when connection data loads
	if (connection && !isEditing) {
		setValue('username', connection.username)
		setValue('password', connection.password)
	}

	const upsertMutation = useMutation({
		mutationFn: async (data: NinjaConnectionFormData) => {
			if (!user?.id) throw new Error('User not authenticated')
			const response = await fetch('/api/ninja-connections/upsert', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					userId: user.id,
					...data,
				}),
			})
			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Failed to save connection')
			}
			return response.json()
		},
		onSuccess: () => {
			setIsEditing(false)
		},
	})

	const onSubmit = (data: NinjaConnectionFormData) => {
		upsertMutation.mutate(data)
	}

	const hasConnection = !!connection?.username

	return (
		<Card>
			<CardHeader>
				<CardTitle>Ninja Account Connection</CardTitle>
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

					{connection?.attempts !== undefined && connection.attempts > 0 && (
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
								onClick={() => setIsEditing(true)}
								variant='outline'
							>
								Edit Credentials
							</Button>
						) : (
							<>
								<Button type='submit' disabled={upsertMutation.isPending}>
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
											setIsEditing(false)
											setValue('username', connection.username)
											setValue('password', connection.password)
										}}
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
