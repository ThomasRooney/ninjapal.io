import { DEVICE_PROPERTY_MAPPINGS } from './device-property-mappings'

export interface AylaDevice {
	dsn: string
	product_name?: string
	model?: string
	mac?: string
	lan_ip?: string
	connection_status?: string
	[key: string]: unknown
}

const REAL_GRILL_FAHRENHEIT_KEYS = [
	'grill',
	'air',
	'smoke',
	'probe0_a',
	'probe0_b',
	'probe1_a',
	'probe1_b',
] as const

const round1 = (value: number) => Math.round(value * 10) / 10

function fahrenheitToCelsius(value: number): number {
	return round1(((value - 32) * 5) / 9)
}

function parseJsonValue(value: unknown): Record<string, unknown> | null {
	if (!value) return null
	if (typeof value === 'string') {
		try {
			const parsed = JSON.parse(value)
			return parsed && typeof parsed === 'object'
				? (parsed as Record<string, unknown>)
				: null
		} catch {
			return null
		}
	}
	return typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function cloneJsonRecord(
	value: Record<string, unknown>,
): Record<string, unknown> {
	return JSON.parse(JSON.stringify(value)) as Record<string, unknown>
}

function normalizeRealGrillStateTemperatures(
	grillState: Record<string, unknown>,
): Record<string, unknown> {
	const normalized = cloneJsonRecord(grillState)
	const isSimulated = normalized.sim === 1
	if (isSimulated) return normalized

	const inputs = normalized.inputs as Record<string, unknown> | undefined
	const temps = inputs?.temps as Record<string, unknown> | undefined
	if (!temps) return normalized

	for (const key of REAL_GRILL_FAHRENHEIT_KEYS) {
		const value = temps[key]
		if (typeof value === 'number') {
			temps[key] = fahrenheitToCelsius(value)
		}
	}

	return normalized
}

function setIfNumber(
	deviceData: Record<string, unknown>,
	key: string,
	value: unknown,
) {
	if (typeof value === 'number' && Number.isFinite(value)) {
		deviceData[key] = round1(value)
	}
}

function setIfSaneTemperature(
	deviceData: Record<string, unknown>,
	key: string,
	value: unknown,
) {
	if (typeof value !== 'number' || !Number.isFinite(value)) return
	if (value < -50 || value > 350) {
		deviceData[key] = null
		return
	}
	deviceData[key] = round1(value)
}

function setIfMeaningfulNumber(
	deviceData: Record<string, unknown>,
	key: string,
	value: unknown,
) {
	if (typeof value !== 'number' || !Number.isFinite(value)) return
	if (value <= 0) {
		deviceData[key] = null
		return
	}
	deviceData[key] = round1(value)
}

/**
 * Builds the devices-row payload from a raw Ayla device + its properties:
 * maps known properties to columns (GET_GrillState first so canonical
 * GET_Temp_* values win), flattens grill state, and collects unmapped
 * fields into additionalDeviceProperties. Extracted from syncRealDevices
 * so the Railway sync worker shares the exact same logic.
 */
export function buildDeviceData(
	device: AylaDevice,
	properties: unknown,
	userId: string,
): Record<string, unknown> {
	// Transform properties array into a more useful object format
	const propertiesMap: Record<string, unknown> = {}
	if (properties && Array.isArray(properties)) {
		for (const propWrapper of properties) {
			const prop = propWrapper.property
			if (prop?.name) {
				propertiesMap[prop.name] = {
					value: prop.value,
					type: prop.type,
					base_type: prop.base_type,
					updated_at: prop.data_updated_at,
				}
			}
		}
	}

	// Create filtered properties map that excludes mapped properties
	const filteredPropertiesMap = Object.fromEntries(
		Object.entries(propertiesMap).filter(
			([propName]) => !DEVICE_PROPERTY_MAPPINGS[propName],
		),
	)

	// Define keys that are already handled as dedicated columns
	const handledTopLevelKeys = new Set([
		'dsn',
		'product_name',
		'model',
		'mac',
		'lan_ip',
		'connection_status',
		'properties', // Original properties array from API
	])

	// Extract only unmapped device fields
	const unmappedApiFields = Object.fromEntries(
		Object.entries(device).filter(([key]) => !handledTopLevelKeys.has(key)),
	)

	// Build clean additionalDeviceProperties without duplication
	const additionalDeviceProperties = {
		...unmappedApiFields,
		properties: filteredPropertiesMap,
		lastSyncedAt: new Date().toISOString(),
	}

	// Build device data with mapped properties
	const deviceData: Record<string, unknown> = {
		id: crypto.randomUUID(),
		userId: userId,
		dsn: device.dsn,
		productName: device.product_name || null,
		model: device.model || null,
		mac: device.mac || null,
		lanIp: device.lan_ip || null,
		connectionStatus: device.connection_status || 'unknown',
		additionalDeviceProperties,
		createdAt: Date.now(),
		updatedAt: Date.now(),
	}

	// Reorder properties to ensure GET_GrillState is processed first,
	// allowing its fallback values to be overwritten by canonical properties.
	const props = Object.entries(propertiesMap)
	const grillStateIndex = props.findIndex(([key]) => key === 'GET_GrillState')
	if (grillStateIndex > -1) {
		const grillStateEntry = props.splice(grillStateIndex, 1)[0]
		props.unshift(grillStateEntry)
	}

	// Map each property to its corresponding column
	for (const [propName, propData] of props) {
		const mapping = DEVICE_PROPERTY_MAPPINGS[propName]
		if (mapping) {
			const { columnName, dataType } = mapping
			const propValue = (propData as Record<string, unknown>).value

			// Convert value based on data type
			let convertedValue = null
			if (propValue !== null && propValue !== undefined) {
				switch (dataType) {
					case 'integer':
						convertedValue =
							typeof propValue === 'number'
								? propValue
								: Number.parseInt(propValue as string)
						break
					case 'numeric':
						convertedValue =
							typeof propValue === 'number'
								? propValue
								: Number.parseFloat(propValue as string)
						break
					case 'boolean':
						convertedValue =
							typeof propValue === 'boolean'
								? propValue
								: propValue === 1 || propValue === '1' || propValue === 'true'
						break
					case 'timestamptz':
						// Handle timestamp conversion - expected format may vary
						if (propName === 'GET_Estimated_End_Time' && propValue) {
							// Try to parse as Unix timestamp or ISO string
							const parsed =
								typeof propValue === 'number'
									? new Date(propValue * 1000) // Unix timestamp
									: new Date(propValue as string | number)
							convertedValue = Number.isNaN(parsed.getTime()) ? null : parsed
						}
						break
					default:
						convertedValue = String(propValue)
						break
				}
			}

			// Set the value in deviceData only if column is enabled
			// Some Ayla devices send null standalone GET_Temp_* properties while
			// GET_GrillState/GET_ProbeState contains useful readings. Do not let a
			// null mapped property erase a better fallback extracted earlier.
			if (convertedValue !== null || deviceData[columnName] === undefined) {
				deviceData[columnName] = convertedValue
			}

			// Special handling for GET_GrillState - flatten the JSON structure
			if (propName === 'GET_GrillState' && propValue) {
				try {
					const parsedGrillState = parseJsonValue(propValue)
					if (!parsedGrillState) continue
					const grillState =
						normalizeRealGrillStateTemperatures(parsedGrillState)
					deviceData.grill_state_raw = JSON.stringify(grillState, null, '\t')

					// Flatten top-level grill state fields
					if (grillState.state !== undefined)
						deviceData.gs_state = grillState.state
					if (grillState.mode !== undefined)
						deviceData.cook_mode = grillState.mode
					if (grillState.message !== undefined)
						deviceData.gs_message = grillState.message
					if (grillState.eventmask !== undefined)
						deviceData.gs_eventmask = grillState.eventmask
					if (grillState.sim !== undefined) deviceData.gs_sim = grillState.sim
					if (grillState.state !== undefined)
						deviceData.cook_state = grillState.state
					if (grillState.smoke !== undefined)
						deviceData.cook_smoke_level = grillState.smoke
					if (grillState.error !== undefined)
						deviceData.error_code = grillState.error
					if (grillState['seconds left'] !== undefined)
						deviceData.seconds_left_on_timer = grillState['seconds left']

					// Extract nested temperature data
					const inputs = grillState.inputs as
						| Record<string, unknown>
						| undefined
					const temps = inputs?.temps as Record<string, unknown> | undefined
					if (temps) {
						// IMPORTANT: The temperature values set here are preliminary fallbacks.
						// They will be overwritten by the more accurate GET_Temp_* properties
						// processed later in this loop. This dual-write approach ensures we have
						// some data even if individual temperature properties are missing.
						setIfNumber(deviceData, 'temp_grill', temps.grill)
						setIfNumber(deviceData, 'temp_air', temps.air)
						setIfNumber(deviceData, 'temp_smoke', temps.smoke)
						setIfMeaningfulNumber(deviceData, 'probe1_temp_a', temps.probe0_a)
						setIfMeaningfulNumber(deviceData, 'probe1_temp_b', temps.probe0_b)
						setIfMeaningfulNumber(deviceData, 'probe2_temp_a', temps.probe1_a)
						setIfMeaningfulNumber(deviceData, 'probe2_temp_b', temps.probe1_b)
						setIfSaneTemperature(deviceData, 'temp_mainpcb', temps.main)
						setIfSaneTemperature(deviceData, 'temp_uipcb', temps.ui)
					}

					// Extract IO data
					const io = inputs?.io as Record<string, unknown> | undefined
					if (io) {
						if (io['lid open'] !== undefined) {
							deviceData.is_lid_open = io['lid open'] === 1
						}
					}
				} catch (error) {
					console.warn(
						`Failed to parse grill_state for device ${device.dsn}:`,
						error,
					)
				}
			}

			if (propName === 'GET_ProbeState' && propValue) {
				const probeState = parseJsonValue(propValue)
				const probes = probeState?.probes
				if (Array.isArray(probes)) {
					probes.slice(0, 2).forEach((probe, index) => {
						if (!probe || typeof probe !== 'object') return
						const probeRecord = probe as Record<string, unknown>
						const probeNumber = index + 1
						const installedKey = `is_probe${probeNumber}_installed`
						const tempKey = `probe${probeNumber}_temp_a`
						const isInstalled = probeRecord['plugged in'] === 1
						deviceData[installedKey] = isInstalled
						if (isInstalled) {
							setIfMeaningfulNumber(deviceData, tempKey, probeRecord.temp)
						} else {
							deviceData[tempKey] = null
						}
					})
				}
			}
		}
	}

	return deviceData
}
