import { useEffect, useState } from 'react'

export const useCountdown = (targetDate: string | null | undefined) => {
	// Handle null/undefined gracefully
	if (!targetDate) {
		return { hours: '00', minutes: '00', seconds: '00', formatted: '00:00:00' }
	}

	const countDownDate = new Date(targetDate).getTime()

	const [countDown, setCountDown] = useState(
		countDownDate - new Date().getTime(),
	)

	useEffect(() => {
		if (!targetDate || countDown <= 0) {
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
