import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Tipos de Receituário permitidos conforme normas da ANVISA
export const prescriptionTypeEnum = [
  'comum',                      // Receita Simples (Sem retenção)
  'controle_especial_branco',   // Controle Especial (Duas vias - Branca)
  'azul_b1_b2',                 // Notificação de Receita B1/B2 (Azul)
  'amarelo_a'                   // Notificação de Receita A (Amarela)
] as const;

// Status do ciclo de vida da receita
export const prescriptionStatusEnum = [
  'rascunho',   // Criada, mas não finalizada/assinada
  'ativa',      // Assinada digitalmente e válida
  'dispensada', // Utilizada na farmácia (caso integrado)
  'expirada',   // Passou do prazo de validade sem uso
  'cancelada'   // Revogada pelo médico
] as const;

// 1. Tabela Principal de Prescrições
export const prescriptions = sqliteTable('prescriptions', {
  id: text('id').primaryKey(), // UUID v4
  tenantId: text('tenant_id').notNull(),
  patientCpf: text('patient_cpf').notNull(),
  patientName: text('patient_name').notNull(),
  patientBirthdate: text('patient_birthdate').notNull(), // Formato ISO AAAA-MM-DD
  
  // Informações do Médico Prescritor (extraídas da sessão/JWT)
  doctorCpf: text('doctor_cpf').notNull(),
  doctorName: text('doctor_name').notNull(),
  doctorCrm: text('doctor_crm').notNull(),
  doctorCrmUf: text('doctor_crm_uf').notNull(), // Sigla do Estado (ex: SP)
  
  // Classificação regulatória da receita
  type: text('type', { enum: prescriptionTypeEnum }).notNull(),
  status: text('status', { enum: prescriptionStatusEnum }).default('rascunho').notNull(),
  
  // Dados de Validade (Regras dinâmicas de expiração)
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  
  // Assinatura Digital ICP-Brasil (Padrão CFM/ITI)
  digitalSignature: text('digital_signature'), // Hash assinado PKCS#7 / CMS
  signedAt: integer('signed_at', { mode: 'timestamp' }),
  payloadHash: text('payload_hash'), // Hash SHA-256 do payload original que foi assinado
  previousHash: text('previous_hash').notNull(),
  currentHash: text('current_hash').notNull()
});

// 2. Tabela de Itens da Prescrição (Medicamentos e Posologia)
export const prescriptionItems = sqliteTable('prescription_items', {
  id: text('id').primaryKey(), // UUID v4
  prescriptionId: text('prescription_id')
    .notNull()
    .references(() => prescriptions.id, { onDelete: 'cascade' }),
  
  medicationName: text('medication_name').notNull(), // Princípio Ativo ou Nome Comercial
  dosageForm: text('dosage_form').notNull(),       // Ex: Comprimido, Xarope, Ampola
  concentration: text('concentration').notNull(),   // Ex: 500mg, 10mg/mL
  quantity: text('quantity').notNull(),             // Ex: 2 caixas, 1 frasco
  instructions: text('instructions').notNull(),     // Posologia e orientações de uso
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

// 3. Tabela de Log de Validação de Receita (Histórico de Dispensação/Uso)
export const prescriptionValidityLogs = sqliteTable('prescription_validity_logs', {
  id: text('id').primaryKey(),
  prescriptionId: text('prescription_id')
    .notNull()
    .references(() => prescriptions.id),
  action: text('action').notNull(), // Ex: 'VALIDATED', 'DISPENSED', 'EXPIRED'
  performedBy: text('performed_by').notNull(), // Identificador da farmácia ou sistema
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});
