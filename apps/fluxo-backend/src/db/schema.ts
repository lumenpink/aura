import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * Sync Fallbacks Table Schema
 * Stores failed synchronization events to be processed later by a Cron reconciliation trigger.
 */
export const syncFallbacks = sqliteTable('sync_fallbacks', {
  id: text('id').primaryKey(),
  entityName: text('entity_name').notNull(),
  recordId: text('record_id').notNull(),
  error: text('error').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Appointments Table Schema
 * Represents the database mapping for core operational appointments.
 */
export const appointments = sqliteTable('appointments', {
  id: text('id').primaryKey(),
  patientName: text('patient_name').notNull(),
  appointmentDate: integer('appointment_date', { mode: 'timestamp' }).notNull(),
  status: text('status').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Patients Stub Table Schema (Aura Fluxo)
 * Local cache of patient profiles for appointment scheduling without N+1 queries.
 */
export const patientsStub = sqliteTable('patients_stub', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  name: text('name').notNull(),
  cpf: text('cpf').notNull(),
  phone: text('phone').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

