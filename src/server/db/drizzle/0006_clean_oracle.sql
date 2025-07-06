ALTER TABLE "devices" ADD COLUMN "gs_state" varchar(50);--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "gs_message" text;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "gs_eventmask" varchar(50);--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "gs_sim" integer;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "temp_smoke" numeric(5, 1);