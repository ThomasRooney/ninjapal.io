import { useZero } from '@/hooks/use-typed-zero'
import type { TempPoint } from '@/lib/cook-analysis'
import { reconstructHistorySnapshots } from '@/lib/historyUtils'
import { useQuery } from '@rocicorp/zero/react'
import { useMemo } from 'react'

/**
 * Reconstructed telemetry series for a device over a trailing window —
 * shared by gauges, sparklines, stall badge, and ETA on the overview.
 */
export function useCookTelemetry(deviceId: string, hours = 3) {
	const z = useZero()
	const startTime = useMemo(() => Date.now() - hours * 3_600_000, [hours])

	const [baseline] = useQuery(
		z.query.deviceHistory
			.where('deviceId', deviceId)
			.where('historyType', 'snapshot')
			.where('recordedAt', '<=', startTime)
			.orderBy('recordedAt', 'desc')
			.limit(1),
	)
	const [records] = useQuery(
		z.query.deviceHistory
			.where('deviceId', deviceId)
			.where('recordedAt', '>', startTime)
			.orderBy('recordedAt', 'desc'),
	)

	return useMemo(() => {
		const all = []
		if (baseline?.[0]) all.push(baseline[0])
		all.push(...(records ?? []))
		const snapshots = reconstructHistorySnapshots(all)
			.filter((s) => s.recordedAt && s.recordedAt > startTime)
			.reverse()

		const seriesOf = (key: string): TempPoint[] =>
			snapshots
				.filter((s) => typeof s.state[key] === 'number')
				.map((s) => ({
					t: s.recordedAt as number,
					value: s.state[key] as number,
				}))

		return {
			loading: records === undefined,
			seriesOf,
		}
	}, [baseline, records, startTime])
}
