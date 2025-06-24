import NavMain from '@/components/nav-main.tsx'
import AlertsPage from '@/components/pages/alerts-page.tsx'
import ChartPage from '@/components/pages/chart-page.tsx'
import ControlPage from '@/components/pages/control-page.tsx'
import LogPage from '@/components/pages/log-page.tsx'
import { mockDevices } from '@/lib/mock-data'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/')({
	component: DashboardPage,
})

function DashboardPage() {
	const [selectedDevice, setSelectedDevice] = useState(mockDevices[0].dsn)

	return (
		<div className='bg-background min-h-screen flex flex-col'>
			<NavMain
				location='homepage'
				selectedDevice={selectedDevice}
				onDeviceChange={setSelectedDevice}
			/>

			<main className='flex-1 space-y-8'>
				<ChartPage />
				<ControlPage />
				<LogPage />
				<AlertsPage />
			</main>
		</div>
	)
}

export default DashboardPage
