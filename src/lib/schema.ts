import { pgTable, serial, uuid, text, boolean, pgEnum, timestamp, integer, primaryKey, index } from 'drizzle-orm/pg-core';

export const usersSimple = pgTable('users_simple', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  workosId: text('workos_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const roleEnum = pgEnum('user_role', ['ADMIN', 'DOCTOR', 'ASSISTANT']);
export const statusEnum = pgEnum('mapping_status', ['ACTIVE', 'INACTIVE', 'TEMPORARY']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // WorkOS UUID
  email: text('email').notNull().unique(),
  role: roleEnum('role'),
});

export const specialties = pgTable('specialties', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull().unique(),
});

export const userSpecialties = pgTable('user_specialties', {
  userId: uuid('user_id').references(() => users.id).notNull(),
  specialtyId: integer('specialty_id').references(() => specialties.id).notNull(),
  isPrimary: boolean('is_primary').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.specialtyId] }),
  index('user_specialties_specialty_idx').on(table.specialtyId),
]);

export const doctorAssistantMapping = pgTable('doctor_assistant_mapping', {
  id: uuid('id').defaultRandom().primaryKey(),
  doctorId: uuid('doctor_id').references(() => users.id).notNull(),
  assistantId: uuid('assistant_id').references(() => users.id).notNull(),
  isPrimary: boolean('is_primary').default(true),
  status: statusEnum('status').default('ACTIVE'),
  assignedAt: timestamp('assigned_at').defaultNow(),
});

export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  doctorId: uuid('doctor_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  completed: boolean('completed').default(false),
});
