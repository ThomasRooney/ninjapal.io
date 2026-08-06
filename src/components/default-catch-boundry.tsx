import {
	ErrorComponent,
	Link,
	rootRouteId,
	useMatch,
	useRouter,
} from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
	const router = useRouter()
	const isRoot = useMatch({
		strict: false,
		select: (state) => state.id === rootRouteId,
	})

	console.error(error)

	return (
		<div className='min-w-0 flex-1 p-4 flex flex-col items-center justify-center gap-6'>
			<ErrorComponent error={error} />
			<div className='flex gap-2 items-center flex-wrap'>
				<button
					type='button'
					onClick={() => {
						router.invalidate()
					}}
					className='px-3 py-1.5 bg-secondary text-secondary-foreground hover:bg-accent rounded-md text-sm font-medium'
				>
					Try Again
				</button>
				{isRoot ? (
					<Link
						to='/'
						className='px-3 py-1.5 bg-secondary text-secondary-foreground hover:bg-accent rounded-md text-sm font-medium'
					>
						Home
					</Link>
				) : (
					<Link
						to='/'
						className='px-3 py-1.5 bg-secondary text-secondary-foreground hover:bg-accent rounded-md text-sm font-medium'
						onClick={(e: React.MouseEvent) => {
							e.preventDefault()
							window.history.back()
						}}
					>
						Go Back
					</Link>
				)}
			</div>
		</div>
	)
}
