import { drizzleZeroConfig } from "drizzle-zero";
import * as drizzleSchema from "@/server/db/schema.ts";

// Define your configuration file for the CLI
export default drizzleZeroConfig(drizzleSchema, {
  // Specify which tables and columns to include in the Zero schema.
  // This allows for the "expand/migrate/contract" pattern recommended in the Zero docs.
  // When a column is first added, it should be set to false, and then changed to true
  // once the migration has been run.

  // All tables/columns must be defined, but can be set to false to exclude them from the Zero schema.
  // Column names match your Drizzle schema definitions
  tables: {
    // this can be set to false
    // e.g. user: false,
    users: {
      id: true,
      email: true,
      name: true,
    },
    persons: {
      // or this can be set to false
      // e.g. id: false,
      id: true,
      name: true,
      email: true, // New column - now enabled for Zero sync
    },
    ninjaConnections: {
      userId: true, // Enable for Zero sync
      username: true,
      password: true,
      attempts: true,
      oauthAccessToken: true,
      oauthRefreshToken: true,
      oauthExpiresAt: true,
      aylaAccessToken: true,
      aylaRefreshToken: true,
      aylaExpiresAt: true,
      createdAt: true,
      updatedAt: true,
    },
    devices: {
      // Core fields
      id: true, // Primary key must be enabled for Zero
      userId: true, // Enable for user association
      dsn: true, // Enable for display
      productName: true, // Enable for display
      model: true, // Enable for display
      mac: true, // Enable for display
      lanIp: true, // Enable for display
      connectionStatus: true, // Enable for display
      
      // Signal & Connectivity - NEW COLUMNS
      rssi: false,
      bt_rssi: false,
      
      // Physical State - NEW COLUMNS
      is_lid_open: false,
      
      // Temperature Readings - NEW COLUMNS
      temp_air: false,
      temp_grill: false,
      temp_uipcb: false,
      temp_mainpcb: false,
      probe1_temp: false,
      probe2_temp: false,
      
      // Cooking State - NEW COLUMNS
      cook_state_raw: false,
      cook_mode: false,
      cook_state: false,
      cook_smoke_level: false,
      cook_notifications: false,
      cook_defaults: false,
      
      // Device State - NEW COLUMNS
      power_state: false,
      error_code: false,
      grill_state_raw: false,
      probe_state_raw: false,
      combined_state_raw: false,
      
      // Timers & Scheduling - NEW COLUMNS
      seconds_until_auto_off: false,
      seconds_left_on_timer: false,
      estimated_end_at: false,
      
      // Firmware & Versions - NEW COLUMNS
      ota_fw_version: false,
      wifi_fw_version: false,
      wifi_hw_version: false,
      main_pcb_fw_version: false,
      main_pcb_hw_version: false,
      ubd_version: false,
      
      // Device Info - NEW COLUMNS
      device_serial_num: false,
      device_model_number: false,
      wifi_module_serial_number: false,
      build_factory: false,
      
      // OTA & Updates - NEW COLUMNS
      ota_progress: false,
      
      // Probe State - NEW COLUMNS
      is_probe1_installed: false,
      is_probe2_installed: false,
      
      // Debug & Diagnostics - NEW COLUMNS
      is_module_debug: false,
      
      // Commands & Responses - NEW COLUMNS
      last_cook_response: false,
      last_exec_response: false,
      
      // Setpoints & Commands - NEW COLUMNS
      grill_power_setpoint: false,
      reset_wifi_commanded_at: false,
      reset_factory_commanded_at: false,
      cook_command: false,
      exec_command: false,
      module_debug_setpoint: false,
      rt_log_enabled_setpoint: false,
      rssi_report_period_setpoint: false,
      cook_skip_directive: false,
      
      // Legacy fields
      additionalDeviceProperties: true, // Enable for JSON modal
      createdAt: true, // Enable for timestamps
      updatedAt: true, // Enable for timestamps
    },
  },

  // Specify the casing style to use for the schema.
  // This is useful for when you want to use a different casing style than the default.
  // This works in the same way as the `casing` option in the Drizzle ORM.
  //
  // @example
  // casing: "snake_case",
});