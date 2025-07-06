-- Rename existing probe columns
ALTER TABLE "devices" RENAME COLUMN "probe1_temp" TO "probe1_temp_a";
ALTER TABLE "devices" RENAME COLUMN "probe2_temp" TO "probe2_temp_a";

-- Add new probe B columns
ALTER TABLE "devices" ADD COLUMN "probe1_temp_b" numeric(5, 1);
ALTER TABLE "devices" ADD COLUMN "probe2_temp_b" numeric(5, 1);