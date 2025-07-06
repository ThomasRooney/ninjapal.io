import { useZero } from '@/hooks/use-typed-zero'
import { useQuery } from '@rocicorp/zero/react'
import { createFileRoute } from '@tanstack/react-router'
import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/_authed/app/_layout/')({
	component: RedirectComponent,
})

function RedirectComponent() {
	const navigate = useNavigate()
	const z = useZero()
	const [connections] = useQuery(z.query.ninjaConnections)

	useEffect(() => {
		// Only redirect once connections data is loaded
		if (connections !== undefined) {
			const hasConnection = !!connections?.[0]?.username

			if (!hasConnection) {
				navigate({ to: '/app/ninja-connection', replace: true })
			} else {
				navigate({ to: '/app/devices', replace: true })
			}
		}
	}, [connections, navigate])

	// Show nothing while determining where to redirect
	return null
}
