CREATE TABLE "works" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"time_entry_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"type_of_work" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"hours" numeric(5, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "time_entries" DROP CONSTRAINT "time_entries_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "works" ADD CONSTRAINT "works_time_entry_id_time_entries_id_fk" FOREIGN KEY ("time_entry_id") REFERENCES "public"."time_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "works" ADD CONSTRAINT "works_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "works" ADD CONSTRAINT "works_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_works_time_entry" ON "works" USING btree ("time_entry_id");--> statement-breakpoint
CREATE INDEX "idx_works_user" ON "works" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "time_entries" DROP COLUMN "project_id";--> statement-breakpoint
ALTER TABLE "time_entries" DROP COLUMN "type_of_work";--> statement-breakpoint
ALTER TABLE "time_entries" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "time_entries" DROP COLUMN "hours";