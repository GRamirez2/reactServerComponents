CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'DOCTOR', 'ASSISTANT');--> statement-breakpoint
CREATE TYPE "public"."mapping_status" AS ENUM('ACTIVE', 'INACTIVE', 'TEMPORARY');--> statement-breakpoint
CREATE TABLE "doctor_assistant_mapping" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"assistant_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT true,
	"status" "mapping_status" DEFAULT 'ACTIVE',
	"assigned_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"title" text NOT NULL,
	"completed" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role" "user_role",
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "doctor_assistant_mapping" ADD CONSTRAINT "doctor_assistant_mapping_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_assistant_mapping" ADD CONSTRAINT "doctor_assistant_mapping_assistant_id_users_id_fk" FOREIGN KEY ("assistant_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;