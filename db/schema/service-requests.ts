import { pgEnum, pgTable, text, uuid, timestamp, jsonb } from 'drizzle-orm/pg-core'

// Enums
export const serviceRequestStatus = pgEnum('ServiceRequestStatus', [
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
])

export const serviceRequestPriority = pgEnum('ServiceRequestPriority', [
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
])

// Table
export const serviceRequest = pgTable('service_request', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: serviceRequestStatus('status').default('OPEN').notNull(),
  priority: serviceRequestPriority('priority').default('MEDIUM').notNull(),
  category: text('category'),

  // Relations (FKs by convention; define explicit FKs in migrations if desired)
  organizationId: text('organizationId').notNull(),
  createdById: uuid('createdById').notNull(),
  assignedToId: uuid('assignedToId'),

  // Metadata
  attachments: jsonb('attachments'),
  internalNotes: text('internalNotes'),

  // Timestamps
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
  resolvedAt: timestamp('resolvedAt', { mode: 'date' }),
  closedAt: timestamp('closedAt', { mode: 'date' }),
})
