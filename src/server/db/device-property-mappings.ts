/**
 * Mapping table for Ninja API device properties to database columns
 * This file defines how device properties from the API are mapped to our database schema
 */

export interface PropertyMapping {
	columnName: string
	dataType:
		| 'integer'
		| 'numeric'
		| 'boolean'
		| 'varchar'
		| 'text'
		| 'timestamptz'
	pgType?: string // Specific PostgreSQL type if needed
}

/**
 * Complete mapping of all known device properties to database columns
 * Key: Original property name from Ninja API
 * Value: Column configuration for database
 */
export const DEVICE_PROPERTY_MAPPINGS: Record<string, PropertyMapping> = {
	// Signal & Connectivity
	GET_RSSI: { columnName: 'rssi', dataType: 'integer' },
	GET_BT_RSSI: { columnName: 'bt_rssi', dataType: 'integer' },

	// Physical State
	GET_Lid_Open: { columnName: 'is_lid_open', dataType: 'boolean' },

	// Temperature Readings
	GET_Temp_Air: {
		columnName: 'temp_air',
		dataType: 'numeric',
		pgType: 'NUMERIC(5,1)',
	},
	GET_Temp_Grill: {
		columnName: 'temp_grill',
		dataType: 'numeric',
		pgType: 'NUMERIC(5,1)',
	},
	GET_Temp_UIPCB: {
		columnName: 'temp_uipcb',
		dataType: 'numeric',
		pgType: 'NUMERIC(5,1)',
	},
	GET_Temp_MainPCB: {
		columnName: 'temp_mainpcb',
		dataType: 'numeric',
		pgType: 'NUMERIC(5,1)',
	},
	GET_Probe1_Temp: {
		columnName: 'probe1_temp_a',
		dataType: 'numeric',
		pgType: 'NUMERIC(5,1)',
	},
	GET_Probe2_Temp: {
		columnName: 'probe2_temp_a',
		dataType: 'numeric',
		pgType: 'NUMERIC(5,1)',
	},

	// Cooking State
	GET_CookState: { columnName: 'cook_state_raw', dataType: 'text' }, // JSON string
	GET_Cook_Mode: {
		columnName: 'cook_mode',
		dataType: 'varchar',
		pgType: 'VARCHAR(50)',
	},
	GET_Cook_State: {
		columnName: 'cook_state',
		dataType: 'varchar',
		pgType: 'VARCHAR(50)',
	},
	GET_Cook_Smoke_Enabled: {
		columnName: 'cook_smoke_level',
		dataType: 'integer',
	}, // Not boolean - can have multiple values
	GET_Cook_Notifications: {
		columnName: 'cook_notifications',
		dataType: 'integer',
	},
	GET_CookDefaults: { columnName: 'cook_defaults', dataType: 'text' },

	// Device State
	GET_Power_State: {
		columnName: 'power_state',
		dataType: 'varchar',
		pgType: 'VARCHAR(50)',
	},
	GET_Error_Code: { columnName: 'error_code', dataType: 'integer' },
	GET_GrillState: { columnName: 'grill_state_raw', dataType: 'text' }, // JSON string
	GET_ProbeState: { columnName: 'probe_state_raw', dataType: 'text' }, // JSON string
	GET_CombinedState: { columnName: 'combined_state_raw', dataType: 'text' }, // JSON string

	// Timers & Scheduling
	GET_Seconds_To_Off: {
		columnName: 'seconds_until_auto_off',
		dataType: 'integer',
	},
	GET_Seconds_Left_Timer: {
		columnName: 'seconds_left_on_timer',
		dataType: 'integer',
	},
	GET_Estimated_End_Time: {
		columnName: 'estimated_end_at',
		dataType: 'timestamptz',
	},

	// Firmware & Versions
	OTA_FW_VERSION: {
		columnName: 'ota_fw_version',
		dataType: 'varchar',
		pgType: 'VARCHAR(100)',
	},
	GET_WiFi_FW_Version: {
		columnName: 'wifi_fw_version',
		dataType: 'varchar',
		pgType: 'VARCHAR(100)',
	},
	GET_WiFi_HW_Version: {
		columnName: 'wifi_hw_version',
		dataType: 'varchar',
		pgType: 'VARCHAR(100)',
	},
	GET_Main_PCB_FW_Version: {
		columnName: 'main_pcb_fw_version',
		dataType: 'varchar',
		pgType: 'VARCHAR(100)',
	},
	GET_Main_PCB_HW_Version: {
		columnName: 'main_pcb_hw_version',
		dataType: 'varchar',
		pgType: 'VARCHAR(100)',
	},
	GET_UBD_Version: {
		columnName: 'ubd_version',
		dataType: 'varchar',
		pgType: 'VARCHAR(100)',
	},

	// Device Info
	GET_Device_Serial_Num: {
		columnName: 'device_serial_num',
		dataType: 'varchar',
		pgType: 'VARCHAR(100)',
	},
	GET_Device_Model_Number: {
		columnName: 'device_model_number',
		dataType: 'varchar',
		pgType: 'VARCHAR(100)',
	},
	GET_WiFiModuleSerialNumber: {
		columnName: 'wifi_module_serial_number',
		dataType: 'varchar',
		pgType: 'VARCHAR(100)',
	},
	GET_BuildFactory: {
		columnName: 'build_factory',
		dataType: 'varchar',
		pgType: 'VARCHAR(50)',
	},

	// OTA & Updates
	GET_OTA_Progress: {
		columnName: 'ota_progress',
		dataType: 'varchar',
		pgType: 'VARCHAR(255)',
	},

	// Probe State
	GET_Probe1_Installed: {
		columnName: 'is_probe1_installed',
		dataType: 'boolean',
	},
	GET_Probe2_Installed: {
		columnName: 'is_probe2_installed',
		dataType: 'boolean',
	},

	// Debug & Diagnostics
	Get_Module_debug: { columnName: 'is_module_debug', dataType: 'boolean' },

	// Commands & Responses
	GET_Cook_Response: { columnName: 'last_cook_response', dataType: 'text' },
	GET_Exec_Response: { columnName: 'last_exec_response', dataType: 'text' },

	// Setpoints & Commands (using timestamp pattern for commands)
	SET_GrillPower: {
		columnName: 'grill_power_setpoint',
		dataType: 'varchar',
		pgType: 'VARCHAR(50)',
	},
	SET_Reset_WiFi: {
		columnName: 'reset_wifi_commanded_at',
		dataType: 'timestamptz',
	},
	SET_Reset_Factory: {
		columnName: 'reset_factory_commanded_at',
		dataType: 'timestamptz',
	},
	SET_Cook_Command: { columnName: 'cook_command', dataType: 'text' },
	SET_Exec_Command: { columnName: 'exec_command', dataType: 'text' },
	Set_Module_Debug: {
		columnName: 'module_debug_setpoint',
		dataType: 'boolean',
	},
	SET_Enable_RT_Log: {
		columnName: 'rt_log_enabled_setpoint',
		dataType: 'boolean',
	},
	SET_ReportRSSIPeriod: {
		columnName: 'rssi_report_period_setpoint',
		dataType: 'integer',
	},
	SET_CookSkipDirective: {
		columnName: 'cook_skip_directive',
		dataType: 'text',
	},
}

/**
 * Helper function to get column name for a property
 */
export function getColumnNameForProperty(
	propertyName: string,
): string | undefined {
	return DEVICE_PROPERTY_MAPPINGS[propertyName]?.columnName
}

/**
 * Helper function to check if a property is mapped
 */
export function isPropertyMapped(propertyName: string): boolean {
	return propertyName in DEVICE_PROPERTY_MAPPINGS
}
