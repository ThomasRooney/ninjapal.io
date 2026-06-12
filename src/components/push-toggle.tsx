import { Button } from '@/components/ui/button'
import { createServerFn } from '@tanstack/react-start'
import { Bell, BellOff, BellRing } from 'lucide-react'
import { useEffect, useState } from 'react'

const savePushSubscription = createServerFn({ method: 'POST' })
	.validator(
		(d: {
			endpoint: string
			keys: { p256dh: string; auth: string }
			userAgent: string | null
		}) => d,
	)
	.handler(async ({ data }) => {
		const { saveSubscription } = await import('@/server/push')
		await saveSubscription(
			{ endpoint: data.endpoint, keys: data.keys },
			data.userAgent,
		)
		return { ok: true }
	})

const removePushSubscription = createServerFn({ method: 'POST' })
	.validator((d: { endpoint: string }) => d)
	.handler(async ({ data }) => {
		const { removeSubscription } = await import('@/server/push')
		await removeSubscription(data.endpoint)
		return { ok: true }
	})

function urlBase64ToUint8Array(base64: string): Uint8Array {
	const padding = '='.repeat((4 - (base64.length % 4)) % 4)
	const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
	return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

type PushState = 'unsupported' | 'denied' | 'off' | 'on' | 'busy'

/**
 * Permissions API first: headless Chromium (and some embedded webviews)
 * report a stale `Notification.permission` while permissions.query is
 * accurate.
 */
async function notificationPermission(): Promise<NotificationPermission> {
	try {
		const status = await navigator.permissions.query({
			name: 'notifications' as PermissionName,
		})
		if (status.state === 'granted' || status.state === 'denied') {
			return status.state
		}
		return 'default'
	} catch {
		return Notification.permission
	}
}

/** Bell toggle: subscribes this browser to coaching-message push. */
export function PushToggle() {
	const [state, setState] = useState<PushState>('busy')

	useEffect(() => {
		;(async () => {
			if (
				!('serviceWorker' in navigator) ||
				!('PushManager' in window) ||
				!import.meta.env.VITE_VAPID_PUBLIC_KEY
			) {
				setState('unsupported')
				return
			}
			if ((await notificationPermission()) === 'denied') {
				setState('denied')
				return
			}
			const registration = await navigator.serviceWorker.register('/sw.js')
			const sub = await registration.pushManager.getSubscription()
			setState(sub ? 'on' : 'off')
		})().catch(() => setState('unsupported'))
	}, [])

	async function toggle() {
		if (state !== 'on' && state !== 'off') return
		setState('busy')
		try {
			const registration = await navigator.serviceWorker.ready
			const existing = await registration.pushManager.getSubscription()
			if (existing) {
				await removePushSubscription({
					data: { endpoint: existing.endpoint },
				})
				await existing.unsubscribe()
				setState('off')
				return
			}
			let permission = await notificationPermission()
			if (permission === 'default') {
				permission = await Notification.requestPermission()
			}
			if (permission !== 'granted') {
				setState('denied')
				return
			}
			const sub = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(
					import.meta.env.VITE_VAPID_PUBLIC_KEY as string,
				),
			})
			const json = sub.toJSON()
			if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
				throw new Error('Browser returned an incomplete subscription')
			}
			await savePushSubscription({
				data: {
					endpoint: json.endpoint,
					keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
					userAgent: navigator.userAgent,
				},
			})
			setState('on')
		} catch (error) {
			console.error('push toggle failed', error)
			setState('off')
		}
	}

	if (state === 'unsupported') return null
	const Icon = state === 'on' ? BellRing : state === 'denied' ? BellOff : Bell
	return (
		<Button
			size='sm'
			variant={state === 'on' ? 'default' : 'outline'}
			onClick={toggle}
			disabled={state === 'busy' || state === 'denied'}
			title={
				state === 'denied'
					? 'Notifications are blocked in your browser settings'
					: state === 'on'
						? 'Push notifications on — click to disable'
						: 'Get push notifications for coaching alerts'
			}
			data-testid='push-toggle'
			data-push-state={state}
		>
			<Icon className='h-4 w-4 mr-1.5' />
			{state === 'on' ? 'Alerts on' : state === 'denied' ? 'Blocked' : 'Alerts'}
		</Button>
	)
}
