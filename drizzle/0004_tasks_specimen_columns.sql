ALTER TABLE "tasks" RENAME COLUMN "title" TO "speciman_name";--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "specimen_id" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "case_id" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "spec_frozen" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "points" integer;
