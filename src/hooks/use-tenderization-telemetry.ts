import { useZero } from '@/hooks/use-typed-zero'
import { reconstructHistorySnapshots } from '@/lib/historyUtils'
import { useQuery } from '@rocicorp/zero/react'
import { useMemo } from 'react'

/** Full cook window plus its baseline; preserve nulls and connection state. */
export function useTenderizationTelemetry(
	deviceId: string,
	start: number,
	end: number,
) {
	const z = useZero()
	const [baseline, baselineStatus] = useQuery(
		z.query.deviceHistory
			.where('deviceId', deviceId)
			.where('historyType', 'snapshot')
			.where('recordedAt', '<=', start)
			.orderBy('recordedAt', 'desc')
			.limit(1),
	)
	// Include patches between the baseline and start, not just after start.
	const [records, recordsStatus] = useQuery(
		z.query.deviceHistory
			.where('deviceId', deviceId)
			.where('recordedAt', '>', baseline?.[0]?.recordedAt ?? start)
			.where('recordedAt', '<=', end)
			.orderBy('recordedAt', 'desc'),
		{ enabled: baselineStatus.type === 'complete' },
	)
	const snapshots = useMemo(
		() =>
			reconstructHistorySnapshots(
				[...(baseline ?? []), ...(records ?? [])].sort(
					(a, b) => (b.recordedAt ?? 0) - (a.recordedAt ?? 0),
				),
			),
		[baseline, records],
	)
	return {
		snapshots,
		loading:
			baselineStatus.type !== 'complete' || recordsStatus.type !== 'complete',
	}
}
