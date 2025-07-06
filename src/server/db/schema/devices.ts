import {
	boolean,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core'

export const devices = pgTable(
	'devices',
	{
		// Core fields
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id').notNull(), // RLS will handle the auth.users relationship

		// Device identifiers
		dsn: varchar('dsn', { length: 256 }).notNull(), // Device serial number

		// Essential device info
		productName: varchar('product_name', { length: 256 }),
		model: varchar('model', { length: 256 }),

		// Network info
		mac: varchar('mac', { length: 17 }), // Standard MAC address format
		lanIp: varchar('lan_ip', { length: 45 }), // Supports IPv4 and IPv6

		// Status
		connectionStatus: varchar('connection_status', { length: 50 }), // online, offline, etc.

		// Signal & Connectivity
		rssi: integer('rssi'),
		bt_rssi: integer('bt_rssi'),

		// Physical State
		is_lid_open: boolean('is_lid_open'),

		// Temperature Readings
		temp_air: numeric('temp_air', { precision: 5, scale: 1 }),
		temp_grill: numeric('temp_grill', { precision: 5, scale: 1 }),
		temp_uipcb: numeric('temp_uipcb', { precision: 5, scale: 1 }),
		temp_mainpcb: numeric('temp_mainpcb', { precision: 5, scale: 1 }),
		probe1_temp_a: numeric('probe1_temp_a', { precision: 5, scale: 1 }), // Renamed from probe1_temp
		probe1_temp_b: numeric('probe1_temp_b', { precision: 5, scale: 1 }), // NEW
		probe2_temp_a: numeric('probe2_temp_a', { precision: 5, scale: 1 }), // Renamed from probe2_temp
		probe2_temp_b: numeric('probe2_temp_b', { precision: 5, scale: 1 }), // NEW

		// Cooking State
		cook_state_raw: text('cook_state_raw'), // JSON string
		cook_mode: varchar('cook_mode', { length: 50 }),
		cook_state: varchar('cook_state', { length: 50 }),
		cook_smoke_level: integer('cook_smoke_level'), // Not boolean - can have multiple values
		cook_notifications: integer('cook_notifications'),
		cook_defaults: text('cook_defaults'),

		// Device State
		power_state: varchar('power_state', { length: 50 }),
		error_code: integer('error_code'),

		// Grill State flattened from grill_state_raw
		gs_state: varchar('gs_state', { length: 50 }), // from 'state'
		gs_message: text('gs_message'), // from 'message'
		gs_eventmask: varchar('gs_eventmask', { length: 50 }), // from 'eventmask'
		gs_sim: integer('gs_sim'), // from 'sim'
		temp_smoke: numeric('temp_smoke', { precision: 5, scale: 1 }), // from inputs.temps.smoke

		// RAW JSON fields (to be deprecated)
		grill_state_raw: text('grill_state_raw'), // JSON string
		probe_state_raw: text('probe_state_raw'), // JSON string
		combined_state_raw: text('combined_state_raw'), // JSON string

		// Timers & Scheduling
		seconds_until_auto_off: integer('seconds_until_auto_off'),
		seconds_left_on_timer: integer('seconds_left_on_timer'),
		estimated_end_at: timestamp('estimated_end_at', { withTimezone: true }),

		// Firmware & Versions
		ota_fw_version: varchar('ota_fw_version', { length: 100 }),
		wifi_fw_version: varchar('wifi_fw_version', { length: 100 }),
		wifi_hw_version: varchar('wifi_hw_version', { length: 100 }),
		main_pcb_fw_version: varchar('main_pcb_fw_version', { length: 100 }),
		main_pcb_hw_version: varchar('main_pcb_hw_version', { length: 100 }),
		ubd_version: varchar('ubd_version', { length: 100 }),

		// Device Info
		device_serial_num: varchar('device_serial_num', { length: 100 }),
		device_model_number: varchar('device_model_number', { length: 100 }),
		wifi_module_serial_number: varchar('wifi_module_serial_number', {
			length: 100,
		}),
		build_factory: varchar('build_factory', { length: 50 }),

		// OTA & Updates
		ota_progress: varchar('ota_progress', { length: 255 }),

		// Probe State
		is_probe1_installed: boolean('is_probe1_installed'),
		is_probe2_installed: boolean('is_probe2_installed'),

		// Debug & Diagnostics
		is_module_debug: boolean('is_module_debug'),

		// Commands & Responses
		last_cook_response: text('last_cook_response'),
		last_exec_response: text('last_exec_response'),

		// Setpoints & Commands (using timestamp pattern for commands)
		grill_power_setpoint: varchar('grill_power_setpoint', { length: 50 }),
		reset_wifi_commanded_at: timestamp('reset_wifi_commanded_at', {
			withTimezone: true,
		}),
		reset_factory_commanded_at: timestamp('reset_factory_commanded_at', {
			withTimezone: true,
		}),
		cook_command: text('cook_command'),
		exec_command: text('exec_command'),
		module_debug_setpoint: boolean('module_debug_setpoint'),
		rt_log_enabled_setpoint: boolean('rt_log_enabled_setpoint'),
		rssi_report_period_setpoint: integer('rssi_report_period_setpoint'),
		cook_skip_directive: text('cook_skip_directive'),

		// Properties from the properties endpoint (keeping for backward compatibility)
		additionalDeviceProperties: jsonb('additional_device_properties'),

		// Timestamps
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		dsnUserIdUnique: unique('devices_dsn_user_id_unique').on(
			table.dsn,
			table.userId,
		),
	}),
)
