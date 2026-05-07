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

export const usersSimple = pgTable('users_simple', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  workosId: text('workos_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

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
  email: text('email').notNull().unique(),
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

export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  doctorId: text('doctor_id')
    .references(() => users.id)
    .notNull(),
  title: text('title').notNull(),
  completed: boolean('completed').default(false),
});
