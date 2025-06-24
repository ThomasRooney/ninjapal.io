export interface MockDevice {
	product_name: string
	model: string
	dsn: string
	oem_model: string
	connection_status: 'Online' | 'Offline'
	thermometer1: number
	thermometer2: number
	grillTemperature: number
	targetTemp: number
	cookTime: number // in minutes
	mode:
		| 'grill'
		| 'smoker'
		| 'air fry'
		| 'roast'
		| 'bake'
		| 'reheat'
		| 'dehydrate'
		| 'idle'
	smoke: 0 | 1
}

export interface TemperatureDataPoint {
	time: string
	temp: number
	thermometer1: number
	thermometer2: number
	mode:
		| 'grill'
		| 'smoker'
		| 'air fry'
		| 'roast'
		| 'bake'
		| 'reheat'
		| 'dehydrate'
	smoke: 0 | 1
	targetTemp: number
}

export interface CookSession {
	id: string
	startTime: string
	endTime: string | null
	mode:
		| 'grill'
		| 'smoker'
		| 'air fry'
		| 'roast'
		| 'bake'
		| 'reheat'
		| 'dehydrate'
	maxTemp: number
	duration: string
	name: string
}

export interface Alert {
	id: string
	type: 'cook_complete' | 'temp_reached' | 'probe_alert' | 'device_offline'
	enabled: boolean
	threshold?: number
}

// Generate temperature data for the last 4 hours
export function generateTemperatureData(): TemperatureDataPoint[] {
	const data: TemperatureDataPoint[] = []
	const now = new Date()
	const startTime = new Date(now.getTime() - 4 * 60 * 60 * 1000) // 4 hours ago

	let currentTemp = 75 // Starting at room temp
	let thermo1 = 65
	let thermo2 = 68
	let targetTemp = 225
	let mode:
		| 'grill'
		| 'smoker'
		| 'air fry'
		| 'roast'
		| 'bake'
		| 'reheat'
		| 'dehydrate' = 'smoker'
	let smoke: 0 | 1 = 1

	// Generate data points every 5 minutes
	for (let i = 0; i <= 48; i++) {
		const time = new Date(startTime.getTime() + i * 5 * 60 * 1000)
		const timeStr = time.toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
		})

		// Simulate temperature changes
		if (i < 6) {
			// Preheating phase
			currentTemp += Math.random() * 20 + 10
			thermo1 += Math.random() * 15 + 8
			thermo2 += Math.random() * 15 + 8
		} else if (i < 24) {
			// Stable smoking
			currentTemp = targetTemp + (Math.random() - 0.5) * 10
			thermo1 = 165 + (Math.random() - 0.5) * 10
			thermo2 = 158 + (Math.random() - 0.5) * 10
		} else if (i < 30) {
			// Switch to grill mode
			mode = 'grill'
			smoke = 0
			targetTemp = 450
			currentTemp += (targetTemp - currentTemp) * 0.2 + Math.random() * 5
			thermo1 += Math.random() * 10
			thermo2 += Math.random() * 10
		} else if (i < 36) {
			// Switch to air fry mode
			mode = 'air fry'
			targetTemp = 400
			currentTemp = targetTemp + (Math.random() - 0.5) * 10
			thermo1 = 195 + (Math.random() - 0.5) * 5
			thermo2 = 192 + (Math.random() - 0.5) * 5
		} else {
			// Stable grilling
			currentTemp = targetTemp + (Math.random() - 0.5) * 15
			thermo1 = 205 + (Math.random() - 0.5) * 5
			thermo2 = 201 + (Math.random() - 0.5) * 5
		}

		data.push({
			time: timeStr,
			temp: Math.round(currentTemp),
			thermometer1: Math.round(thermo1),
			thermometer2: Math.round(thermo2),
			mode,
			smoke,
			targetTemp,
		})
	}

	return data
}

export const mockDevices: MockDevice[] = [
	{
		product_name: 'Young Smoky',
		model: 'OG900-EU',
		dsn: 'DEMO000000001',
		oem_model: 'OG900-EU',
		connection_status: 'Online',
		thermometer1: 165,
		thermometer2: 158,
		grillTemperature: 225,
		targetTemp: 225,
		cookTime: 240, // 4 hours
		mode: 'smoker',
		smoke: 1,
	},
	{
		product_name: 'Backyard Beast',
		model: 'OG700-US',
		dsn: 'DEMO000000002',
		oem_model: 'OG700-US',
		connection_status: 'Offline',
		thermometer1: 0,
		thermometer2: 0,
		grillTemperature: 0,
		targetTemp: 0,
		cookTime: 0,
		mode: 'idle',
		smoke: 0,
	},
]

export const mockCookSessions: CookSession[] = [
	{
		id: '1',
		startTime: '2025-06-23T14:00:00',
		endTime: '2025-06-24T02:00:00',
		mode: 'smoker',
		maxTemp: 275,
		duration: '12h',
		name: 'Brisket',
	},
	{
		id: '2',
		startTime: '2025-06-22T16:00:00',
		endTime: '2025-06-22T20:00:00',
		mode: 'smoker',
		maxTemp: 275,
		duration: '4h',
		name: 'Baby Back Ribs',
	},
	{
		id: '3',
		startTime: '2025-06-21T17:00:00',
		endTime: '2025-06-21T19:00:00',
		mode: 'air fry',
		maxTemp: 400,
		duration: '2h',
		name: 'Chicken Wings',
	},
	{
		id: '4',
		startTime: '2025-06-20T12:00:00',
		endTime: '2025-06-20T20:00:00',
		mode: 'roast',
		maxTemp: 350,
		duration: '8h',
		name: 'Prime Rib',
	},
]

export const mockAlerts: Alert[] = [
	{
		id: '1',
		type: 'cook_complete',
		enabled: true,
	},
	{
		id: '2',
		type: 'temp_reached',
		enabled: true,
		threshold: 225,
	},
	{
		id: '3',
		type: 'probe_alert',
		enabled: false,
		threshold: 165,
	},
	{
		id: '4',
		type: 'device_offline',
		enabled: true,
	},
]

export function getGrillSettingLabel(temp: number): string {
	if (temp <= 1) return 'Low'
	if (temp <= 2) return 'Medium'
	return 'High'
}

export function getSelectedDevice(): MockDevice {
	return mockDevices[0]
}
