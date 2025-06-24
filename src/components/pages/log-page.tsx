import CookHistoryTable from '@/components/cook-history-table'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export default function LogPage() {
	const handleExport = () => {
		// Mock export functionality
		console.log('Exporting cook history...')
	}

	return (
		<div className='container mx-auto p-4'>
			<div className='flex justify-between items-center mb-4'>
				<h2 className='text-2xl font-bold'>Cook History</h2>
				<Button variant='outline' size='sm' onClick={handleExport}>
					<Download className='mr-2 h-4 w-4' />
					Export CSV
				</Button>
			</div>
			<CookHistoryTable />
		</div>
	)
}
