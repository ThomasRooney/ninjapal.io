/**
 * PitMinder service worker: web-push display + click-through to the
 * messages feed. Kept dependency-free on purpose.
 */
self.addEventListener('push', (event) => {
	let payload = {}
	try {
		payload = event.data ? event.data.json() : {}
	} catch {
		payload = { title: 'PitMinder', body: event.data?.text() }
	}
	const title = payload.title || 'PitMinder'
	event.waitUntil(
		self.registration.showNotification(title, {
			body: payload.body || '',
			icon: '/logo42.png',
			badge: '/logo42.png',
			tag: payload.tag || 'pitminder-message',
			renotify: true,
			data: { url: payload.url || '/app/messages' },
		}),
	)
})

self.addEventListener('notificationclick', (event) => {
	event.notification.close()
	const url = event.notification.data?.url || '/app/messages'
	event.waitUntil(
		clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
			for (const win of wins) {
				if (win.url.includes('/app') && 'focus' in win) {
					win.navigate(url)
					return win.focus()
				}
			}
			return clients.openWindow(url)
		}),
	)
})
