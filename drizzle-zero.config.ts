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
    // better-auth tables — server-side only, never synced to clients
    user: false,
    session: false,
    account: false,
    verification: false,
    users: {
      id: true,
      email: true,
      name: true,
      whitelisted: true,
      last_login_at: false, // server-side only
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
      probe1_temp_a: true, // Renamed from probe1_temp - disabled for migration
      probe1_temp_b: true, // NEW - disabled for migration
      probe2_temp_a: true, // Renamed from probe2_temp - disabled for migration
      probe2_temp_b: true, // NEW - disabled for migration
      probe1_target_temp: true, // app-owned doneness target
      probe2_target_temp: true, // app-owned doneness target
      autopilot_enabled: true,
      autopilot_state: true,
      is_simulated: true,
      sim_state: false, // worker-internal
      hopper_capacity_kg: true,
      pellets_loaded_at: true,
      temp_smoke: true, // New column - enabled after migration complete
      
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
      
      // Grill State flattened fields - enabled after migration complete
      gs_state: true, // New column from grill_state_raw.state
      gs_message: true, // New column from grill_state_raw.message
      gs_eventmask: true, // New column from grill_state_raw.eventmask
      gs_sim: true, // New column from grill_state_raw.sim
      
      // RAW JSON fields (to be deprecated)
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
    // Device history - server-side mutations only (permissions restrict client access)
    deviceHistory: {
      id: true,
      deviceId: true,
      recordedAt: true,
      historyType: true,
      changedBy: true,
      changes: true,
    },
    appConfig: false,
    pushSubscriptions: false,
    directorRuns: {
      id: true,
      userId: true,
      deviceId: true,
      createdAt: true,
      model: true,
      status: true,
      summary: true,
      error: true,
      iterations: true,
      setpointChanges: true,
      messagesSent: true,
      toolCalls: true,
    },
    cookPhotos: {
      id: true,
      userId: true,
      deviceId: true,
      sessionId: true,
      url: true,
      pathname: false,
      contentType: true,
      sizeBytes: true,
      createdAt: true,
    },
    deviceCommands: {
      id: true,
      deviceId: true,
      userId: true,
      kind: true,
      payload: true,
      source: true,
      status: true,
      error: true,
      createdAt: true,
      executedAt: true,
    },
    cookMessages: {
      id: true,
      userId: true,
      deviceId: true,
      sessionId: true,
      createdAt: true,
      kind: true,
      title: true,
      body: true,
      requiresAck: true,
      actions: true,
      response: true,
      ackedAt: true,
    },
    cookSessions: {
      id: true,
      deviceId: true,
      userId: true,
      name: true,
      cook_mode: true,
      startedAt: true,
      endedAt: true,
      setpoint: true,
      max_temp_grill: true,
      avg_temp_grill: true,
      max_probe1_temp: true,
      stability_score: true,
      stall_seconds: true,
      lid_open_count: true,
    },
  },

  // Specify the casing style to use for the schema.
  // This is useful for when you want to use a different casing style than the default.
  // This works in the same way as the `casing` option in the Drizzle ORM.
  //
  // @example
  // casing: "snake_case",
});