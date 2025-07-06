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
      prefers_celsius: true, // Enable for Zero sync
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
      
      // Signal & Connectivity
      rssi: true,
      bt_rssi: true,
      
      // Physical State
      is_lid_open: true,
      
      // Temperature Readings
      temp_air: true,
      temp_grill: true,
      temp_uipcb: true,
      temp_mainpcb: true,
      probe1_temp: true,
      probe2_temp: true,
      
      // Cooking State
      cook_state_raw: true,
      cook_mode: true,
      cook_state: true,
      cook_smoke_level: true,
      cook_notifications: true,
      cook_defaults: true,
      
      // Device State
      power_state: true,
      error_code: true,
      grill_state_raw: true,
      probe_state_raw: true,
      combined_state_raw: true,
      
      // Timers & Scheduling
      seconds_until_auto_off: true,
      seconds_left_on_timer: true,
      estimated_end_at: true,
      
      // Firmware & Versions
      ota_fw_version: true,
      wifi_fw_version: true,
      wifi_hw_version: true,
      main_pcb_fw_version: true,
      main_pcb_hw_version: true,
      ubd_version: true,
      
      // Device Info
      device_serial_num: true,
      device_model_number: true,
      wifi_module_serial_number: true,
      build_factory: true,
      
      // OTA & Updates
      ota_progress: true,
      
      // Probe State
      is_probe1_installed: true,
      is_probe2_installed: true,
      
      // Debug & Diagnostics
      is_module_debug: true,
      
      // Commands & Responses
      last_cook_response: true,
      last_exec_response: true,
      
      // Setpoints & Commands
      grill_power_setpoint: true,
      reset_wifi_commanded_at: true,
      reset_factory_commanded_at: true,
      cook_command: true,
      exec_command: true,
      module_debug_setpoint: true,
      rt_log_enabled_setpoint: true,
      rssi_report_period_setpoint: true,
      cook_skip_directive: true,
      
      // Legacy fields
      additionalDeviceProperties: true, // Enable for JSON modal
      createdAt: true, // Enable for timestamps
      updatedAt: true, // Enable for timestamps
    },
    // Device history is read-only through Zero - no client mutations allowed
    deviceHistory: {
      id: true,
      deviceId: true,
      recordedAt: true,
      operation: true,
      changedBy: true,
      changes: true,
    },
  },

  // Specify the casing style to use for the schema.
  // This is useful for when you want to use a different casing style than the default.
  // This works in the same way as the `casing` option in the Drizzle ORM.
  //
  // @example
  // casing: "snake_case",
});