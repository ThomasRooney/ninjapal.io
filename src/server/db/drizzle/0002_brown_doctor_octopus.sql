ALTER TABLE "devices" ADD COLUMN "rssi" integer;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "bt_rssi" integer;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "is_lid_open" boolean;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "temp_air" numeric(5, 1);--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "temp_grill" numeric(5, 1);--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "temp_uipcb" numeric(5, 1);--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "temp_mainpcb" numeric(5, 1);--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "probe1_temp" numeric(5, 1);--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "probe2_temp" numeric(5, 1);--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "cook_state_raw" text;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "cook_mode" varchar(50);--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "cook_state" varchar(50);--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "cook_smoke_level" integer;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "cook_notifications" integer;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "cook_defaults" text;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "power_state" varchar(50);--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "error_code" integer;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "grill_state_raw" text;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "probe_state_raw" text;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "combined_state_raw" text;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "seconds_until_auto_off" integer;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "seconds_left_on_timer" integer;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "estimated_end_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "ota_fw_version" varchar(100);--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "wifi_fw_version" varchar(100);--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "wifi_hw_version" varchar(100);--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "main_pcb_fw_version" varchar(100);--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "main_pcb_hw_version" varchar(100);--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "ubd_version" varchar(100);--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "device_serial_num" varchar(100);--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "device_model_number" varchar(100);--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "wifi_module_serial_number" varchar(100);--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "build_factory" varchar(50);--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "ota_progress" varchar(255);--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "is_probe1_installed" boolean;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "is_probe2_installed" boolean;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "is_module_debug" boolean;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "last_cook_response" text;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "last_exec_response" text;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "grill_power_setpoint" varchar(50);--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "reset_wifi_commanded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "reset_factory_commanded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "cook_command" text;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "exec_command" text;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "module_debug_setpoint" boolean;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "rt_log_enabled_setpoint" boolean;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "rssi_report_period_setpoint" integer;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "cook_skip_directive" text;