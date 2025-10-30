import { pgEnum, pgTable, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core'

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
export const serviceRequest = pgTable(
  'service_request',
  {
    id: text('id').primaryKey(),
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
  },
  (t) => ({
    organizationIdIdx: index('service_request_organizationId_idx').on(t.organizationId),
    createdByIdIdx: index('service_request_createdById_idx').on(t.createdById),
    assignedToIdIdx: index('service_request_assignedToId_idx').on(t.assignedToId),
    statusIdx: index('service_request_status_idx').on(t.status),
    createdAtIdx: index('service_request_createdAt_idx').on(t.createdAt),
  })
)


