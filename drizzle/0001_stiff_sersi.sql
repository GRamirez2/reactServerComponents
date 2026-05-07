CREATE TABLE "specialties" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "specialties_code_unique" UNIQUE("code"),
	CONSTRAINT "specialties_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user_specialties" (
	"user_id" uuid NOT NULL,
	"specialty_id" integer NOT NULL,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_specialties_user_id_specialty_id_pk" PRIMARY KEY("user_id","specialty_id")
);
--> statement-breakpoint
ALTER TABLE "user_specialties" ADD CONSTRAINT "user_specialties_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_specialties" ADD CONSTRAINT "user_specialties_specialty_id_specialties_id_fk" FOREIGN KEY ("specialty_id") REFERENCES "public"."specialties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_specialties_specialty_idx" ON "user_specialties" USING btree ("specialty_id");