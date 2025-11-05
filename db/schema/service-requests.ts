import { pgEnum, pgTable, text, uuid, timestamp, jsonb, index } from 'drizzle-orm/pg-core'

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
  createdById: text('createdById').notNull(),
  assignedToId: text('assignedToId'),

  // Metadata
  attachments: jsonb('attachments'),
  internalNotes: text('internalNotes'),

  // Timestamps
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
  resolvedAt: timestamp('resolvedAt', { mode: 'date' }),
  closedAt: timestamp('closedAt', { mode: 'date' }),
})

// Indexes
export const serviceRequestOrganizationIdIdx = index('service_request_organizationId_idx').on(serviceRequest.organizationId)
export const serviceRequestCreatedByIdIdx = index('service_request_createdById_idx').on(serviceRequest.createdById)
export const serviceRequestAssignedToIdIdx = index('service_request_assignedToId_idx').on(serviceRequest.assignedToId)
export const serviceRequestStatusIdx = index('service_request_status_idx').on(serviceRequest.status)
export const serviceRequestCreatedAtIdx = index('service_request_createdAt_idx').on(serviceRequest.createdAt)
