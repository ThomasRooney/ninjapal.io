-- Drop the existing table to recreate with all changes
DROP TABLE IF EXISTS "ninja_connections";

-- Create the table with all the correct columns
CREATE TABLE "ninja_connections" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"username" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"oauth_access_token" text,
	"oauth_refresh_token" text,
	"oauth_expires_at" timestamp with time zone,
	"ayla_access_token" text,
	"ayla_refresh_token" text,
	"ayla_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);