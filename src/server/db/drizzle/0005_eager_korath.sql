ALTER TABLE "devices" DROP CONSTRAINT "devices_dsn_unique";--> statement-breakpoint
ALTER TABLE "device_history" ADD COLUMN "history_type" text NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_device_history_device_id" ON "device_history" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "idx_device_history_recorded_at" ON "device_history" USING btree ("recorded_at");--> statement-breakpoint
-- Create immutable function wrapper for date_trunc
CREATE OR REPLACE FUNCTION date_trunc_immutable(text, timestamptz)
RETURNS timestamptz AS
$$
  SELECT date_trunc($1, $2);
$$
LANGUAGE SQL IMMUTABLE;

--> statement-breakpoint
CREATE UNIQUE INDEX "one_snapshot_per_hour_idx" ON "device_history" USING btree ("device_id", date_trunc_immutable('hour', "recorded_at")) WHERE "device_history"."history_type" = 'snapshot';--> statement-breakpoint
ALTER TABLE "device_history" DROP COLUMN "operation";--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_dsn_user_id_unique" UNIQUE("dsn","user_id");