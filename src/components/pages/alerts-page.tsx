import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { mockAlerts } from '@/lib/mock-data'
import { Bell, ThermometerSun, Timer, WifiOff } from 'lucide-react'
import { useState } from 'react'

export default function AlertsPage() {
	const [alerts, setAlerts] = useState(mockAlerts)

	const toggleAlert = (id: string) => {
		setAlerts(
			alerts.map((alert) =>
				alert.id === id ? { ...alert, enabled: !alert.enabled } : alert,
			),
		)
	}

	const updateThreshold = (id: string, value: string) => {
		const numValue = Number.parseInt(value)
		if (!Number.isNaN(numValue)) {
			setAlerts(
				alerts.map((alert) =>
					alert.id === id ? { ...alert, threshold: numValue } : alert,
				),
			)
		}
	}

	const getAlertIcon = (type: string) => {
		switch (type) {
			case 'cook_complete':
				return <Timer className='h-5 w-5' />
			case 'temp_reached':
				return <ThermometerSun className='h-5 w-5' />
			case 'probe_alert':
				return <ThermometerSun className='h-5 w-5' />
			case 'device_offline':
				return <WifiOff className='h-5 w-5' />
			default:
				return <Bell className='h-5 w-5' />
		}
	}

	const getAlertTitle = (type: string) => {
		switch (type) {
			case 'cook_complete':
				return 'Cook Complete'
			case 'temp_reached':
				return 'Temperature Reached'
			case 'probe_alert':
				return 'Probe Temperature Alert'
			case 'device_offline':
				return 'Device Offline'
			default:
				return 'Alert'
		}
	}

	const getAlertDescription = (type: string) => {
		switch (type) {
			case 'cook_complete':
				return 'Notify when cooking timer expires'
			case 'temp_reached':
				return 'Notify when target temperature is reached'
			case 'probe_alert':
				return 'Notify when probe reaches target temperature'
			case 'device_offline':
				return 'Notify when device goes offline'
			default:
				return 'Configure alert settings'
		}
	}

	return (
		<div className='container mx-auto p-4'>
			<div className='space-y-4'>
				<div>
					<h2 className='text-2xl font-bold mb-2'>Alert Settings</h2>
					<p className='text-muted-foreground'>
						Configure notifications for your smoker
					</p>
				</div>

				<div className='grid gap-4'>
					{alerts.map((alert) => (
						<Card key={alert.id}>
							<CardHeader>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-3'>
										{getAlertIcon(alert.type)}
										<div>
											<CardTitle className='text-base'>
												{getAlertTitle(alert.type)}
											</CardTitle>
											<CardDescription className='mt-1'>
												{getAlertDescription(alert.type)}
											</CardDescription>
										</div>
									</div>
									<Switch
										checked={alert.enabled}
										onCheckedChange={() => toggleAlert(alert.id)}
									/>
								</div>
							</CardHeader>
							{alert.threshold !== undefined && (
								<CardContent>
									<div className='flex items-center gap-4'>
										<Label
											htmlFor={`threshold-${alert.id}`}
											className='min-w-[100px]'
										>
											Threshold
										</Label>
										<div className='flex items-center gap-2'>
											<Input
												id={`threshold-${alert.id}`}
												type='number'
												value={alert.threshold}
												onChange={(e) =>
													updateThreshold(alert.id, e.target.value)
												}
												className='w-24'
												disabled={!alert.enabled}
											/>
											<span className='text-sm text-muted-foreground'>°F</span>
										</div>
									</div>
								</CardContent>
							)}
						</Card>
					))}
				</div>

				<Card className='bg-muted/50'>
					<CardHeader>
						<CardTitle className='text-base'>Notification Settings</CardTitle>
						<CardDescription>
							To receive notifications, please log in and connect your device
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		</div>
	)
}
