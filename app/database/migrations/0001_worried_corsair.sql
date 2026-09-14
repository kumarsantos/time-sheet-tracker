ALTER TYPE "public"."timesheet_status" ADD VALUE 'REJECTED';--> statement-breakpoint
CREATE INDEX "idx_timesheets_org_status_start" ON "timesheets" USING btree ("org_id","status","start_date");