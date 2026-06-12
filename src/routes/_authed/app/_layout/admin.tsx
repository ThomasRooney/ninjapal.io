import NavApp from '@/components/nav-app.tsx'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { authClient } from '@/lib/auth-client'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { UserRound } from 'lucide-react'
import { useState } from 'react'

const fetchAdminData = createServerFn({ method: 'GET' }).handler(async () => {
	const { requireAdmin, listUsersWithStats, getAppConfig } = await import(
		'@/server/admin'
	)
	await requireAdmin()
	const [users, config] = await Promise.all([
		listUsersWithStats(),
		getAppConfig(),
	])
	return { users, config: config as Record<string, string> }
})

const updateWhitelist = createServerFn({ method: 'POST' })
	.validator((d: { userId: string; whitelisted: boolean }) => d)
	.handler(async ({ data }) => {
		const { requireAdmin, setWhitelisted } = await import('@/server/admin')
		await requireAdmin()
		await setWhitelisted(data.userId, data.whitelisted)
		return { ok: true }
	})

const updateConfig = createServerFn({ method: 'POST' })
	.validator((d: { key: string; value: string }) => d)
	.handler(async ({ data }) => {
		const { requireAdmin, setAppConfig } = await import('@/server/admin')
		await requireAdmin()
		await setAppConfig(data.key, data.value)
		return { ok: true }
	})

export const Route = createFileRoute('/_authed/app/_layout/admin')({
	beforeLoad: ({ context }) => {
		if (!context.user?.isAdmin) {
			throw redirect({ to: '/app' })
		}
	},
	component: AdminPage,
	ssr: false,
})

const MODEL_OPTIONS = [
	'claude-haiku-4-5-20251001',
	'claude-sonnet-4-6',
	'claude-opus-4-8',
	'claude-fable-5',
]

function AdminPage() {
	const router = useRouter()
	const { data, refetch, isLoading } = useQuery({
		queryKey: ['admin-data'],
		queryFn: () => fetchAdminData(),
	})
	const [modelDraft, setModelDraft] = useState<string | null>(null)

	const currentModel =
		modelDraft ??
		((data?.config.pit_director_model as string) || 'claude-haiku-4-5-20251001')

	async function toggleWhitelist(userId: string, whitelisted: boolean) {
		await updateWhitelist({ data: { userId, whitelisted } })
		refetch()
	}

	async function impersonate(userId: string) {
		await authClient.admin.impersonateUser({ userId })
		await router.invalidate()
		window.location.href = '/app'
	}

	async function saveModel() {
		await updateConfig({
			data: { key: 'pit_director_model', value: currentModel },
		})
		setModelDraft(null)
		refetch()
	}

	return (
		<div className='container flex flex-col min-h-screen'>
			<NavApp title='Admin' />
			<div className='p-4 md:p-8 space-y-6'>
				<h1 className='text-3xl font-bold'>Admin</h1>

				<Card data-testid='admin-config'>
					<CardHeader>
						<CardTitle>Pit director</CardTitle>
					</CardHeader>
					<CardContent className='flex flex-wrap items-center gap-2'>
						<span className='text-sm text-muted-foreground'>Model</span>
						<select
							className='h-9 rounded-md border border-input bg-background px-2 text-sm'
							value={currentModel}
							onChange={(e) => setModelDraft(e.target.value)}
							data-testid='admin-model-select'
						>
							{MODEL_OPTIONS.map((m) => (
								<option key={m} value={m}>
									{m}
								</option>
							))}
						</select>
						<Button
							size='sm'
							onClick={saveModel}
							disabled={modelDraft === null}
							data-testid='admin-model-save'
						>
							Save
						</Button>
						<span className='text-xs text-muted-foreground ml-2'>
							runs every ~10 min per active cook on the worker
						</span>
					</CardContent>
				</Card>

				<Card data-testid='admin-users'>
					<CardHeader>
						<CardTitle>Users {data ? `(${data.users.length})` : ''}</CardTitle>
					</CardHeader>
					<CardContent>
						{isLoading ? (
							<p className='text-sm text-muted-foreground'>Loading…</p>
						) : (
							<div className='overflow-x-auto'>
								<table className='w-full text-sm'>
									<thead>
										<tr className='text-left text-muted-foreground border-b'>
											<th className='py-2 pr-4'>User</th>
											<th className='py-2 pr-4'>Last login</th>
											<th className='py-2 pr-4'>Devices</th>
											<th className='py-2 pr-4'>Cooks</th>
											<th className='py-2 pr-4'>Msgs</th>
											<th className='py-2 pr-4'>Whitelisted</th>
											<th className='py-2'>Actions</th>
										</tr>
									</thead>
									<tbody>
										{data?.users.map((u) => (
											<tr
												key={u.id}
												className='border-b last:border-0'
												data-testid='admin-user-row'
											>
												<td className='py-2 pr-4'>
													<p className='font-medium'>{u.name}</p>
													<p className='text-xs text-muted-foreground'>
														{u.email}
														{u.role === 'admin' && ' · admin'}
													</p>
												</td>
												<td className='py-2 pr-4 text-muted-foreground'>
													{u.lastLoginAt
														? new Date(u.lastLoginAt).toLocaleString([], {
																day: 'numeric',
																month: 'short',
																hour: '2-digit',
																minute: '2-digit',
															})
														: '—'}
												</td>
												<td className='py-2 pr-4 tabular-nums'>
													{u.deviceCount}
												</td>
												<td className='py-2 pr-4 tabular-nums'>
													{u.cookCount}
												</td>
												<td className='py-2 pr-4 tabular-nums'>
													{u.messageCount}
												</td>
												<td className='py-2 pr-4'>
													<Switch
														checked={u.whitelisted}
														onCheckedChange={(v) => toggleWhitelist(u.id, v)}
														data-testid={`whitelist-${u.email}`}
													/>
												</td>
												<td className='py-2'>
													<Button
														size='sm'
														variant='outline'
														className='h-7 text-xs'
														onClick={() => impersonate(u.id)}
														data-testid={`impersonate-${u.email}`}
													>
														<UserRound className='h-3 w-3 mr-1' />
														Impersonate
													</Button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
