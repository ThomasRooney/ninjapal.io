CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"dsn" varchar(256) NOT NULL,
	"product_name" varchar(256),
	"model" varchar(256),
	"mac" varchar(17),
	"lan_ip" varchar(45),
	"connection_status" varchar(50),
	"additional_device_properties" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "devices_dsn_unique" UNIQUE("dsn")
);
