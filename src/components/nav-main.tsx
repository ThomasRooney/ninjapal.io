import DeviceSelector from '@/components/device-selector.tsx'
import Logo from '@/components/logo.tsx'
import { Button } from '@/components/ui/button.tsx'
import { mockDevices } from '@/lib/mock-data'
import { Link, useRouterState } from '@tanstack/react-router'

interface HeaderProps {
	location?: 'homepage' | 'auth' | 'app'
	selectedDevice?: string
	onDeviceChange?: (device: string) => void
}

export default function NavMain({
	location = 'homepage',
	selectedDevice,
	onDeviceChange,
}: HeaderProps) {
	return location === 'homepage' ? (
		<HomePageHeader
			selectedDevice={selectedDevice}
			onDeviceChange={onDeviceChange}
		/>
	) : location === 'auth' ? (
		<AuthPageHeader />
	) : null
}

const HomePageHeader = ({
	selectedDevice = mockDevices[0].dsn,
	onDeviceChange = () => {},
}: Omit<HeaderProps, 'location'>) => {
	const routerState = useRouterState()
	const user = routerState.matches[0]?.context?.user

	const isLoggedIn = !!user

	return (
		<div className='w-full bg-background border-b border-border'>
			<nav className='w-full py-4 px-4 flex justify-between items-center text-base h-18'>
				<div className='flex items-center gap-4'>
					<Link
						className='font-semibold text-sm flex items-center gap-2 p-1.5'
						to='/'
						data-testid='main-heading'
					>
						<Logo />
						Ninjapal
					</Link>
					<DeviceSelector
						value={selectedDevice}
						onValueChange={onDeviceChange}
					/>
				</div>
				<div className='flex gap-6 items-center text-sm'>
					{isLoggedIn ? (
						<Link to='/app'>
							<Button size='sm' variant='default'>
								Dashboard
							</Button>
						</Link>
					) : (
						<Link to='/auth/login'>
							<Button size='sm' variant='outline'>
								Login
							</Button>
						</Link>
					)}
				</div>
			</nav>
		</div>
	)
}

const AuthPageHeader = () => {
	return (
		<nav className='w-full py-4 px-4 bg-background flex justify-between items-center border-b border-border h-18'>
			<Link
				className='font-semibold text-sm flex items-center gap-2 p-1.5'
				to='/'
			>
				<Logo />
				Zero Start
			</Link>
		</nav>
	)
}
