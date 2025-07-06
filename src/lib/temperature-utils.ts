export type TemperatureUnit = 'celsius' | 'fahrenheit'

export const fahrenheitToCelsius = (
	f: number | null | undefined,
): number | null | undefined => {
	if (f === null || f === undefined) return f
	return Math.round((((f - 32) * 5) / 9) * 10) / 10
}

export const celsiusToFahrenheit = (
	c: number | null | undefined,
): number | null | undefined => {
	if (c === null || c === undefined) return c
	return Math.round(((c * 9) / 5 + 32) * 10) / 10
}

export const formatTemperature = (
	temp: number | null | undefined,
	prefersCelsius: boolean,
	raw_data_format: TemperatureUnit = 'fahrenheit',
): string => {
	if (temp === null || temp === undefined) return '--'

	let value: number | null | undefined = temp

	// Convert if source and target units differ
	if (raw_data_format === 'fahrenheit' && prefersCelsius) {
		value = fahrenheitToCelsius(temp)
	} else if (raw_data_format === 'celsius' && !prefersCelsius) {
		value = celsiusToFahrenheit(temp)
	}

	const unit = prefersCelsius ? '°C' : '°F'

	return `${value}${unit}`
}
