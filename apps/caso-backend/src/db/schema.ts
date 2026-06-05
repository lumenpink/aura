import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const patients = sqliteTable('patients', {
  id: text('id').primaryKey(), // UUID
  tenantId: text('tenant_id').notNull(),
  name: text('name').notNull(),
  cpf: text('cpf').notNull(),
  phone: text('phone').notNull(),
  address: text('address'), // JSON string representing CEP, UF, IBGE, etc.
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const clinicalEvolutions = sqliteTable('clinical_evolutions', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  patientId: text('patient_id').notNull(),
  doctorCpf: text('doctor_cpf').notNull(),
  notes: text('notes').notNull(),
  previousHash: text('previous_hash').notNull(),
  currentHash: text('current_hash').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const anamneses = sqliteTable('anamneses', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  patientId: text('patient_id').notNull(),
  doctorCpf: text('doctor_cpf').notNull(),
  content: text('content').notNull(), // JSON string representing custom template answers
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const allergies = sqliteTable('allergies', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  patientId: text('patient_id').notNull(),
  substance: text('substance').notNull(),
  severity: text('severity').notNull(), // Leve, Moderada, Grave
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const patientDiagnoses = sqliteTable('patient_diagnoses', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  patientId: text('patient_id').notNull(),
  cidCode: text('cid_code').notNull(), // CID-10 / CID-11
  description: text('description').notNull(),
  status: text('status').notNull(), // Ativo, Inativo, Resolvido
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const patientAttachments = sqliteTable('patient_attachments', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  patientId: text('patient_id').notNull(),
  fileName: text('file_name').notNull(),
  r2Key: text('r2_key').notNull(),
  uploadedBy: text('uploaded_by').notNull(), // Doctor CPF
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
