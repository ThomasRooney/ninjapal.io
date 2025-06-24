import { Badge } from '@/components/ui/badge'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { mockCookSessions } from '@/lib/mock-data'

export default function CookHistoryTable() {
	const formatDate = (dateString: string) => {
		const date = new Date(dateString)
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		})
	}

	const formatTime = (dateString: string) => {
		const date = new Date(dateString)
		return date.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
		})
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Cook History</CardTitle>
				<CardDescription>Your recent cooking sessions</CardDescription>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Date</TableHead>
							<TableHead>Time</TableHead>
							<TableHead>Mode</TableHead>
							<TableHead>Duration</TableHead>
							<TableHead className='text-right'>Max Temp</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{mockCookSessions.map((session) => (
							<TableRow key={session.id}>
								<TableCell className='font-medium'>{session.name}</TableCell>
								<TableCell>{formatDate(session.startTime)}</TableCell>
								<TableCell>
									{formatTime(session.startTime)} -{' '}
									{session.endTime
										? formatTime(session.endTime)
										: 'In Progress'}
								</TableCell>
								<TableCell>
									<Badge
										variant={
											session.mode === 'grill' ? 'destructive' : 'default'
										}
									>
										{session.mode === 'grill' ? 'Grill' : 'Smoker'}
									</Badge>
								</TableCell>
								<TableCell>{session.duration}</TableCell>
								<TableCell className='text-right'>
									{session.maxTemp}°F
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	)
}
