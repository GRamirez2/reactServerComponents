ALTER TABLE "specialties"
  RENAME COLUMN "code" TO "code_range";--> statement-breakpoint
ALTER TABLE "specialties"
  RENAME COLUMN "name" TO "category";--> statement-breakpoint
ALTER TABLE "specialties"
  RENAME CONSTRAINT "specialties_code_unique" TO "specialties_code_range_unique";--> statement-breakpoint
ALTER TABLE "specialties"
  RENAME CONSTRAINT "specialties_name_unique" TO "specialties_category_unique";