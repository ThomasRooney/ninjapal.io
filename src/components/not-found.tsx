import { Button } from '@/components/ui/button.tsx'
import { Link } from '@tanstack/react-router'

export function NotFound({ children }: { children?: React.ReactNode }) {
	return (
		<div className='space-y-2 p-2'>
			<div className='text-muted-foreground'>
				{children || <p>The page you are looking for does not exist.</p>}
			</div>
			<p className='flex items-center gap-2 flex-wrap'>
				<Button size='sm' onClick={() => window.history.back()}>
					Go back
				</Button>
				<Link
					to='/'
					className='bg-secondary text-secondary-foreground hover:bg-accent px-3 py-1.5 rounded-md text-sm font-medium'
				>
					Start Over
				</Link>
			</p>
		</div>
	)
}
