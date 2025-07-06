import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { useZero } from '@/hooks/use-typed-zero'
import { useQuery } from '@rocicorp/zero/react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
	'/_authed/app/_layout/device/$deviceId/raw',
)({
	component: DeviceRawDataPage,
	ssr: false,
})

function DeviceRawDataPage() {
	const { deviceId } = Route.useParams()
	const z = useZero()

	const [devices] = useQuery(z.query.devices.where('id', deviceId))
	const device = devices?.[0]

	if (!device) {
		return null
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Raw Device Data</CardTitle>
				<CardDescription>
					Complete device record from the database
				</CardDescription>
			</CardHeader>
			<CardContent>
				<pre
					className='text-xs bg-muted p-4 rounded-lg overflow-auto max-h-[600px]'
					data-testid='device-raw-json'
				>
					{JSON.stringify(device, null, 2)}
				</pre>
			</CardContent>
		</Card>
	)
}
