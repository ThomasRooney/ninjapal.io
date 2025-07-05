export const fahrenheitToCelsius = (
	f: number | null | undefined,
): number | null | undefined => {
	if (f === null || f === undefined) return f
	return Math.round((((f - 32) * 5) / 9) * 10) / 10
}

export const formatTemperature = (
	temp: number | null | undefined,
	prefersCelsius: boolean,
): string => {
	if (temp === null || temp === undefined) return '--'

	const value = prefersCelsius ? fahrenheitToCelsius(temp) : temp
	const unit = prefersCelsius ? '°C' : '°F'

	return `${value}${unit}`
}
