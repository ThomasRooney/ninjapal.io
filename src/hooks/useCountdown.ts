import { useEffect, useState } from 'react'

export const useCountdown = (targetDate: string | null | undefined) => {
	// NaN when absent — hooks must run unconditionally (rules of hooks)
	const countDownDate = targetDate ? new Date(targetDate).getTime() : Number.NaN

	const [countDown, setCountDown] = useState(
		Number.isNaN(countDownDate) ? 0 : countDownDate - new Date().getTime(),
	)

	useEffect(() => {
		if (!targetDate || Number.isNaN(countDownDate) || countDown <= 0) {
			setCountDown(0)
			return
		}

		const interval = setInterval(() => {
			const remaining = countDownDate - new Date().getTime()

			if (remaining <= 0) {
				clearInterval(interval)
				setCountDown(0)
			} else {
				setCountDown(remaining)
			}
		}, 1000)

		return () => clearInterval(interval)
	}, [targetDate, countDownDate, countDown])

	return formatTime(countDown)
}

const formatTime = (timeInMs: number) => {
	if (timeInMs <= 0) {
		return { hours: '00', minutes: '00', seconds: '00', formatted: '00:00:00' }
	}

	const seconds = Math.floor((timeInMs / 1000) % 60)
	const minutes = Math.floor((timeInMs / (1000 * 60)) % 60)
	const hours = Math.floor((timeInMs / (1000 * 60 * 60)) % 24)

	const pad = (num: number) => String(num).padStart(2, '0')

	return {
		hours: pad(hours),
		minutes: pad(minutes),
		seconds: pad(seconds),
		formatted: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
	}
}
