import {
  pgTable,
  serial,
  uuid,
  text,
  boolean,
  pgEnum,
  timestamp,
  integer,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('user_role', [
  'ADMIN',
  'DOCTOR',
  'ASSISTANT',
  'MEMBER',
]);
export const statusEnum = pgEnum('mapping_status', [
  'ACTIVE',
  'INACTIVE',
  'TEMPORARY',
]);

export const users = pgTable('users', {
  id: text('id').primaryKey(), // WorkOS user ID (e.g. user_...)
  email: text('email').notNull(),
  role: roleEnum('role').notNull().default('MEMBER'),
});

export const specialties = pgTable('specialties', {
  id: serial('id').primaryKey(),
  codeRange: text('code_range').notNull().unique(),
  category: text('category').notNull().unique(),
});

export const userSpecialties = pgTable(
  'user_specialties',
  {
    userId: text('user_id')
      .references(() => users.id)
      .notNull(),
    specialtyId: integer('specialty_id')
      .references(() => specialties.id)
      .notNull(),
    isPrimary: boolean('is_primary').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.specialtyId] }),
    index('user_specialties_specialty_idx').on(table.specialtyId),
  ],
);

export const doctorAssistantMapping = pgTable('doctor_assistant_mapping', {
  id: uuid('id').defaultRandom().primaryKey(),
  doctorId: text('doctor_id')
    .references(() => users.id)
    .notNull(),
  assistantId: text('assistant_id')
    .references(() => users.id)
    .notNull(),
  isPrimary: boolean('is_primary').default(true),
  status: statusEnum('status').default('ACTIVE'),
  assignedAt: timestamp('assigned_at').defaultNow(),
});

export const uploads = pgTable('uploads', {
  id: serial('id').primaryKey(),
  fileName: text('file_name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  createdBy: text('created_by')
    .references(() => users.id)
    .notNull(),
});

export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  doctorId: text('doctor_id')
    .references(() => users.id)
    .notNull(),
  specimanName: text('speciman_name').notNull(),
  specimenId: integer('specimen_id'),
  caseId: integer('case_id'),
  specFrozen: boolean('spec_frozen').default(false),
  points: integer('points'),
  completed: boolean('completed').default(false),
  uploadId: integer('upload_id').references(() => uploads.id),
});
