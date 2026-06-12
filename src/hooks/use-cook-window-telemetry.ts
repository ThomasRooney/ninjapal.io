import { useZero } from '@/hooks/use-typed-zero'
import type { TempPoint } from '@/lib/cook-analysis'
import { reconstructHistorySnapshots } from '@/lib/historyUtils'
import type { ReconstructedState } from '@/lib/historyUtils'
import { useQuery } from '@rocicorp/zero/react'
import { useMemo } from 'react'

/** Reconstructed telemetry for a fixed [start, end] window (session views). */
export function useCookWindowTelemetry(
	deviceId: string,
	start: number,
	end: number,
) {
	const z = useZero()

	const [baseline] = useQuery(
		z.query.deviceHistory
			.where('deviceId', deviceId)
			.where('historyType', 'snapshot')
			.where('recordedAt', '<=', start)
			.orderBy('recordedAt', 'desc')
			.limit(1),
	)
	const [records] = useQuery(
		z.query.deviceHistory
			.where('deviceId', deviceId)
			.where('recordedAt', '>', start)
			.where('recordedAt', '<=', end)
			.orderBy('recordedAt', 'desc'),
	)

	return useMemo(() => {
		const all = []
		if (baseline?.[0]) all.push(baseline[0])
		all.push(...(records ?? []))
		const snapshots: ReconstructedState[] = reconstructHistorySnapshots(all)
			.filter((s) => s.recordedAt && s.recordedAt > start)
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
			snapshots,
			seriesOf,
		}
	}, [baseline, records, start])
}
