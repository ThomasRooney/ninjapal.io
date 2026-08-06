import { useEffect } from 'react'

/** Beacon cadence — matches the server-side stamp throttle. */
export const ACTIVITY_BEACON_INTERVAL_MS = 5 * 60_000

/**
 * Visibility-gated activity beacon (infra/aws/ARCHITECTURE.md): while a
 * dashboard tab is visible, POST /api/activity every 5 minutes so the
 * scale-to-zero idle cron sees live web activity. Hidden tabs stay silent —
 * a backgrounded dashboard must not keep the stack awake. The endpoint is
 * session-authenticated and no-ops when the power table is unconfigured,
 * so this is inert on Vercel/local today.
 */
export function ActivityBeacon() {
	useEffect(() => {
		let lastPingMs = 0
		const ping = () => {
			if (document.visibilityState !== 'visible') return
			// Client-side guard so visibility flapping can't spam the endpoint;
			// the server throttles again per process.
			if (Date.now() - lastPingMs < ACTIVITY_BEACON_INTERVAL_MS - 5_000) return
			lastPingMs = Date.now()
			fetch('/api/activity', {
				method: 'POST',
				credentials: 'same-origin',
			}).catch(() => {
				// Best-effort: a sleeping/waking stack rejects this; PowerGate
				// owns that recovery path.
			})
		}
		// No mount-time ping: the SSR fetchUser stamp already covered this
		// page load — the beacon only keeps a VISIBLE tab counted as active.
		const interval = setInterval(ping, ACTIVITY_BEACON_INTERVAL_MS)
		const onVisibility = () => {
			if (document.visibilityState === 'visible') ping()
		}
		document.addEventListener('visibilitychange', onVisibility)
		return () => {
			clearInterval(interval)
			document.removeEventListener('visibilitychange', onVisibility)
		}
	}, [])
	return null
}
