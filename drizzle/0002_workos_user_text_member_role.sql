ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'MEMBER';--> statement-breakpoint

ALTER TABLE "doctor_assistant_mapping" DROP CONSTRAINT "doctor_assistant_mapping_doctor_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "doctor_assistant_mapping" DROP CONSTRAINT "doctor_assistant_mapping_assistant_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_doctor_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "user_specialties" DROP CONSTRAINT "user_specialties_user_id_users_id_fk";--> statement-breakpoint

ALTER TABLE "users" ALTER COLUMN "id" TYPE text USING "id"::text;--> statement-breakpoint
ALTER TABLE "doctor_assistant_mapping" ALTER COLUMN "doctor_id" TYPE text USING "doctor_id"::text;--> statement-breakpoint
ALTER TABLE "doctor_assistant_mapping" ALTER COLUMN "assistant_id" TYPE text USING "assistant_id"::text;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "doctor_id" TYPE text USING "doctor_id"::text;--> statement-breakpoint
ALTER TABLE "user_specialties" ALTER COLUMN "user_id" TYPE text USING "user_id"::text;--> statement-breakpoint

UPDATE "users" SET "role" = 'MEMBER' WHERE "role" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'MEMBER';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL;--> statement-breakpoint

ALTER TABLE "doctor_assistant_mapping" ADD CONSTRAINT "doctor_assistant_mapping_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_assistant_mapping" ADD CONSTRAINT "doctor_assistant_mapping_assistant_id_users_id_fk" FOREIGN KEY ("assistant_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_specialties" ADD CONSTRAINT "user_specialties_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
