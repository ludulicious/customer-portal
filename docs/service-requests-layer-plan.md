# Service Requests Layer Implementation Plan

## Overview

Create a standalone Nuxt layer for service requests that can be easily added or removed from customer portal projects. This layer provides complete CRUD functionality for service requests from both customer and admin perspectives, with proper organization-based access control.

## Prerequisites

- Better-auth with organization plugin configured and implemented
- Better-auth with admin plugin configured
- Prisma client available
- Nuxt UI components available

## Key Changes for Better-Auth Integration

This plan has been updated to work with the existing better-auth organization implementation:

- **Uses existing better-auth Organization model** instead of creating custom organization tables
- **Leverages better-auth organization client** (`authClient.organization.*`) for all organization operations
- **Integrates with better-auth organization roles** for admin permission checks
- **Removes redundant organization management** code since better-auth handles this
- **Updates all API endpoints** to use better-auth organization client methods
- **Simplifies composables** by using better-auth organization client instead of custom organization logic

## Multi-File Prisma Schema Approach

This implementation uses [Prisma's multi-file schema feature](https://www.prisma.io/docs/orm/prisma-schema/overview/location#multi-file-prisma-schema) to organize the database schema by domain:

- **Main schema** (`prisma/schema.prisma`) contains the datasource, generator, and better-auth models
- **Service requests schema** (`layers/service-requests/prisma/service-requests.prisma`) contains only service request related models
- **Configuration** via `prisma.config.ts` file (recommended approach)
- **Automatic inclusion** of all `.prisma` files in the `prisma/` directory
- **Clean separation** of concerns between different feature domains
- **Easy layer removal** by simply deleting the layer directory

## Phase 1: Layer Structure Setup

### 1.1 Create Layer Directory

Create `layers/service-requests/` with the following structure:
```
layers/service-requests/
├── nuxt.config.ts
├── app/
│   ├── components/
│   ├── composables/
│   ├── pages/
│   └── types/
├── server/
│   ├── api/
│   └── utils/
├── prisma/
│   └── service-requests.prisma
└── i18n/
    └── locales/
        ├── en.json
        └── nl.json
```

### 1.2 Create Layer Nuxt Config

Create `layers/service-requests/nuxt.config.ts`:
```typescript
export default defineNuxtConfig({
  // Layer-specific configuration
  compatibilityDate: '2025-10-24',
})
```

## Phase 2: Data Models

### 2.1 Define Service Request Schema

Create `layers/service-requests/prisma/service-requests.prisma`:
```prisma
enum ServiceRequestStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}

enum ServiceRequestPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

model ServiceRequest {
  id             String                  @id @default(cuid())
  title          String
  description    String                  @db.Text
  status         ServiceRequestStatus    @default(OPEN)
  priority       ServiceRequestPriority  @default(MEDIUM)
  category       String?
  
  // Organization relationship
  organizationId String
  organization   Organization            @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  // User relationships
  createdById    String
  createdBy      User                    @relation("ServiceRequestCreator", fields: [createdById], references: [id])
  
  assignedToId   String?
  assignedTo     User?                   @relation("ServiceRequestAssignee", fields: [assignedToId], references: [id])
  
  // Metadata
  attachments    Json?                   // Array of file URLs or metadata
  internalNotes  String?                 @db.Text
  
  // Timestamps
  createdAt      DateTime                @default(now())
  updatedAt      DateTime                @updatedAt
  resolvedAt     DateTime?
  closedAt       DateTime?
  
  @@index([organizationId])
  @@index([createdById])
  @@index([assignedToId])
  @@index([status])
  @@index([createdAt])
  @@map("service_requests")
}
```

### 2.2 Update Main Prisma Schema

Add to `prisma/schema.prisma` in main layer:
```prisma
model User {
  // ... existing fields
  
  createdServiceRequests  ServiceRequest[] @relation("ServiceRequestCreator")
  assignedServiceRequests ServiceRequest[] @relation("ServiceRequestAssignee")
}

// Note: Organization model already exists from better-auth
// Add serviceRequests relation to existing Organization model
model Organization {
  // ... existing better-auth fields
  
  serviceRequests ServiceRequest[]
}
```

### 2.3 Configure Multi-File Prisma Schema

Update `prisma/schema.prisma` to use multi-file schema:
```prisma
// This is your main Prisma schema file
// The datasource and generator blocks must be in this file

generator client {
  provider = "prisma-client-js"
  output   = "./generated/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Import service requests schema from layer
// This will be automatically included when using multi-file schema
```

### 2.4 Configure Prisma for Multi-File Schema

Create `prisma.config.ts` to specify the schema location:
```typescript
import path from 'node:path'
import type { PrismaConfig } from 'prisma'

export default {
  schema: path.join('prisma'),
} satisfies PrismaConfig
```

### 2.5 Run Migration

```bash
npx prisma migrate dev --name add_service_requests
npx prisma generate
```

## Phase 3: Type Definitions

### 3.1 Create TypeScript Types

Create `layers/service-requests/app/types/service-request.d.ts`:
```typescript
export type ServiceRequestStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
export type ServiceRequestPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface ServiceRequest {
  id: string
  title: string
  description: string
  status: ServiceRequestStatus
  priority: ServiceRequestPriority
  category?: string
  organizationId: string
  createdById: string
  assignedToId?: string
  attachments?: any[]
  internalNotes?: string
  createdAt: Date
  updatedAt: Date
  resolvedAt?: Date
  closedAt?: Date
}

export interface ServiceRequestWithRelations extends ServiceRequest {
  createdBy: {
    id: string
    name?: string
    email: string
  }
  assignedTo?: {
    id: string
    name?: string
    email: string
  }
}

export interface ServiceRequestFilters {
  status?: ServiceRequestStatus
  priority?: ServiceRequestPriority
  category?: string
  assignedToId?: string
  createdById?: string
  search?: string
}

export interface ServiceRequestCreateInput {
  title: string
  description: string
  priority?: ServiceRequestPriority
  category?: string
}

export interface ServiceRequestUpdateInput {
  title?: string
  description?: string
  status?: ServiceRequestStatus
  priority?: ServiceRequestPriority
  category?: string
}

export interface AdminServiceRequestUpdateInput extends ServiceRequestUpdateInput {
  assignedToId?: string
  internalNotes?: string
}
```

## Phase 4: Permissions

### 4.1 Add Service Request Permissions

Update `lib/auth/permissions.ts` in main layer:
```typescript
export const statement = {
  ...defaultStatements,
  'service-request': [
    'create',
    'read',
    'update',
    'delete',
    'list',
    'assign',
    'resolve',
    'reopen',
    'view-internal-notes',
    'edit-internal-notes'
  ],
  // ... existing statements
} as const
```

### 4.2 Update Role Permissions

```typescript
export const user = ac.newRole({
  'service-request': [
    'create',        // Create requests for their org
    'read',          // Read requests in their org
    'update',        // Update own requests
    'list'           // List org requests
  ],
  // ... existing permissions
})

export const admin = ac.newRole({
  ...adminAc.statements,
  'service-request': [
    'create',
    'read',
    'update',
    'delete',
    'list',
    'assign',
    'resolve',
    'reopen',
    'view-internal-notes',
    'edit-internal-notes'
  ],
  // ... existing permissions
})
```

## Phase 5: Server API - Validation Utilities

### 5.1 Create Validation Schemas

Create `layers/service-requests/server/utils/service-request-validation.ts`:
```typescript
import { z } from 'zod'

export const createServiceRequestSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  category: z.string().max(100).optional()
})

export const updateServiceRequestSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  category: z.string().max(100).optional()
})

export const adminUpdateServiceRequestSchema = updateServiceRequestSchema.extend({
  assignedToId: z.string().optional(),
  internalNotes: z.string().max(5000).optional()
})

export const filterServiceRequestSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  category: z.string().optional(),
  assignedToId: z.string().optional(),
  createdById: z.string().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional()
})
```

### 5.2 Create Helper Functions

Create `layers/service-requests/server/utils/service-request-helpers.ts`:
```typescript
import { authClient } from '~~/lib/auth-client'

export async function verifyOrganizationAccess(
  userId: string,
  organizationId: string
): Promise<boolean> {
  try {
    // Use better-auth client to check membership
    const { data: member } = await authClient.organization.getActiveMember()
    return member?.organizationId === organizationId
  } catch {
    return false
  }
}

export async function verifyAdminAccess(
  userId: string,
  organizationId: string
): Promise<boolean> {
  try {
    const { data: role } = await authClient.organization.getActiveMemberRole()
    return role?.includes('owner') || role?.includes('admin')
  } catch {
    return false
  }
}

export async function verifyRequestOwnership(
  userId: string,
  requestId: string
): Promise<boolean> {
  const request = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
    select: { createdById: true }
  })
  return request?.createdById === userId
}

export function buildRequestQuery(filters: any) {
  const where: any = {}
  
  if (filters.status) where.status = filters.status
  if (filters.priority) where.priority = filters.priority
  if (filters.category) where.category = filters.category
  if (filters.assignedToId) where.assignedToId = filters.assignedToId
  if (filters.createdById) where.createdById = filters.createdById
  
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } }
    ]
  }
  
  return where
}
```

## Phase 6: Server API - Customer Endpoints

### 6.1 List Service Requests (Customer)

Create `layers/service-requests/server/api/service-requests/index.get.ts`:
```typescript
import { authClient } from '~~/lib/auth-client'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  
  const query = getQuery(event)
  const filters = filterServiceRequestSchema.parse(query)
  
  // Get user's organization using better-auth
  const { data: member } = await authClient.organization.getActiveMember()
  const organizationId = member?.organizationId
  
  if (!organizationId) {
    throw createError({ statusCode: 400, message: 'No organization found' })
  }
  
  const where = {
    organizationId,
    ...buildRequestQuery(filters)
  }
  
  const [requests, total] = await Promise.all([
    prisma.serviceRequest.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        assignedTo: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: ((filters.page || 1) - 1) * (filters.limit || 20),
      take: filters.limit || 20
    }),
    prisma.serviceRequest.count({ where })
  ])
  
  return {
    requests,
    pagination: {
      total,
      page: filters.page || 1,
      limit: filters.limit || 20,
      pages: Math.ceil(total / (filters.limit || 20))
    }
  }
})
```

### 6.2 Create Service Request

Create `layers/service-requests/server/api/service-requests/index.post.ts`:
```typescript
import { authClient } from '~~/lib/auth-client'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  
  const body = await readBody(event)
  const data = createServiceRequestSchema.parse(body)
  
  // Get user's organization using better-auth
  const { data: member } = await authClient.organization.getActiveMember()
  const organizationId = member?.organizationId
  
  if (!organizationId) {
    throw createError({ statusCode: 400, message: 'No organization found' })
  }
  
  const request = await prisma.serviceRequest.create({
    data: {
      ...data,
      organizationId,
      createdById: session.user.id,
      status: 'OPEN',
      priority: data.priority || 'MEDIUM'
    },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true }
      }
    }
  })
  
  return request
})
```

### 6.3 Get Single Service Request

Create `layers/service-requests/server/api/service-requests/[id].get.ts`:
```typescript
import { authClient } from '~~/lib/auth-client'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  
  const id = getRouterParam(event, 'id')
  
  const request = await prisma.serviceRequest.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true }
      },
      assignedTo: {
        select: { id: true, name: true, email: true }
      }
    }
  })
  
  if (!request) {
    throw createError({ statusCode: 404, message: 'Request not found' })
  }
  
  // Verify user has access to this organization's requests
  const hasAccess = await verifyOrganizationAccess(
    session.user.id,
    request.organizationId
  )
  
  if (!hasAccess) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }
  
  // Hide internal notes from non-admin users
  const { data: role } = await authClient.organization.getActiveMemberRole()
  const isAdmin = role?.includes('owner') || role?.includes('admin')
  
  if (!isAdmin) {
    delete request.internalNotes
  }
  
  return request
})
```

### 6.4 Update Service Request

Create `layers/service-requests/server/api/service-requests/[id].patch.ts`:
```typescript
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const data = updateServiceRequestSchema.parse(body)
  
  // Verify ownership or organization membership
  const isOwner = await verifyRequestOwnership(session.user.id, id)
  
  if (!isOwner) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }
  
  // Users can only update certain fields
  const allowedUpdates: any = {}
  if (data.title) allowedUpdates.title = data.title
  if (data.description) allowedUpdates.description = data.description
  if (data.priority) allowedUpdates.priority = data.priority
  if (data.category) allowedUpdates.category = data.category
  
  const request = await prisma.serviceRequest.update({
    where: { id },
    data: allowedUpdates,
    include: {
      createdBy: {
        select: { id: true, name: true, email: true }
      },
      assignedTo: {
        select: { id: true, name: true, email: true }
      }
    }
  })
  
  return request
})
```

### 6.5 Delete Service Request

Create `layers/service-requests/server/api/service-requests/[id].delete.ts`:
```typescript
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  
  const id = getRouterParam(event, 'id')
  
  // Verify ownership
  const isOwner = await verifyRequestOwnership(session.user.id, id)
  
  if (!isOwner) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }
  
  await prisma.serviceRequest.delete({
    where: { id }
  })
  
  return { success: true }
})
```

## Phase 7: Server API - Admin Endpoints

### 7.1 List All Service Requests (Admin)

Create `layers/service-requests/server/api/service-requests/admin/index.get.ts`:
```typescript
import { authClient } from '~~/lib/auth-client'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  
  // Check if user is admin using better-auth organization roles
  const { data: role } = await authClient.organization.getActiveMemberRole()
  const isAdmin = role?.includes('owner') || role?.includes('admin')
  
  if (!isAdmin) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }
  
  const query = getQuery(event)
  const filters = filterServiceRequestSchema.parse(query)
  
  const where = buildRequestQuery(filters)
  
  const [requests, total, stats] = await Promise.all([
    prisma.serviceRequest.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        assignedTo: {
          select: { id: true, name: true, email: true }
        },
        organization: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: ((filters.page || 1) - 1) * (filters.limit || 20),
      take: filters.limit || 20
    }),
    prisma.serviceRequest.count({ where }),
    prisma.serviceRequest.groupBy({
      by: ['status'],
      _count: true
    })
  ])
  
  return {
    requests,
    pagination: {
      total,
      page: filters.page || 1,
      limit: filters.limit || 20,
      pages: Math.ceil(total / (filters.limit || 20))
    },
    stats: stats.reduce((acc, item) => {
      acc[item.status] = item._count
      return acc
    }, {} as Record<string, number>)
  }
})
```

### 7.2 Admin Update Service Request

Create `layers/service-requests/server/api/service-requests/admin/[id].patch.ts`:
```typescript
import { authClient } from '~~/lib/auth-client'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  
  // Check if user is admin using better-auth organization roles
  const { data: role } = await authClient.organization.getActiveMemberRole()
  const isAdmin = role?.includes('owner') || role?.includes('admin')
  
  if (!isAdmin) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }
  
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const data = adminUpdateServiceRequestSchema.parse(body)
  
  // Prepare update data
  const updateData: any = { ...data }
  
  // Handle status transitions
  if (data.status === 'RESOLVED' && !updateData.resolvedAt) {
    updateData.resolvedAt = new Date()
  }
  if (data.status === 'CLOSED' && !updateData.closedAt) {
    updateData.closedAt = new Date()
  }
  
  const request = await prisma.serviceRequest.update({
    where: { id },
    data: updateData,
    include: {
      createdBy: {
        select: { id: true, name: true, email: true }
      },
      assignedTo: {
        select: { id: true, name: true, email: true }
      },
      organization: {
        select: { id: true, name: true }
      }
    }
  })
  
  return request
})
```

## Phase 8: Customer Composables

### 8.1 Create useServiceRequests Composable

Create `layers/service-requests/app/composables/useServiceRequests.ts`:
```typescript
import { authClient } from '~~/lib/auth-client'

export const useServiceRequests = () => {
  const requests = ref<ServiceRequestWithRelations[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const pagination = ref({ total: 0, page: 1, limit: 20, pages: 0 })
  
  const fetchRequests = async (filters?: ServiceRequestFilters) => {
    loading.value = true
    error.value = null
    
    try {
      // Get current organization using better-auth
      const { data: member } = await authClient.organization.getActiveMember()
      const organizationId = member?.organizationId
      
      if (!organizationId) {
        throw new Error('No organization found')
      }
      
      const response = await $fetch('/api/service-requests', {
        query: { ...filters, organizationId }
      })
      requests.value = response.requests
      pagination.value = response.pagination
    } catch (e: any) {
      error.value = e.message
      console.error('Error fetching service requests:', e)
    } finally {
      loading.value = false
    }
  }
  
  const createRequest = async (data: ServiceRequestCreateInput) => {
    loading.value = true
    error.value = null
    
    try {
      const newRequest = await $fetch('/api/service-requests', {
        method: 'POST',
        body: data
      })
      requests.value.unshift(newRequest)
      return newRequest
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }
  
  const updateRequest = async (
    id: string,
    data: ServiceRequestUpdateInput
  ) => {
    loading.value = true
    error.value = null
    
    try {
      const updated = await $fetch(`/api/service-requests/${id}`, {
        method: 'PATCH',
        body: data
      })
      const index = requests.value.findIndex(r => r.id === id)
      if (index !== -1) {
        requests.value[index] = updated
      }
      return updated
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }
  
  const deleteRequest = async (id: string) => {
    loading.value = true
    error.value = null
    
    try {
      await $fetch(`/api/service-requests/${id}`, {
        method: 'DELETE'
      })
      requests.value = requests.value.filter(r => r.id !== id)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }
  
  const getRequest = async (id: string) => {
    loading.value = true
    error.value = null
    
    try {
      return await $fetch(`/api/service-requests/${id}`)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }
  
  return {
    requests: readonly(requests),
    loading: readonly(loading),
    error: readonly(error),
    pagination: readonly(pagination),
    fetchRequests,
    createRequest,
    updateRequest,
    deleteRequest,
    getRequest
  }
}
```

## Phase 9: Admin Composables

### 9.1 Create useAdminServiceRequests Composable

Create `layers/service-requests/app/composables/useAdminServiceRequests.ts`:
```typescript
import { authClient } from '~~/lib/auth-client'

export const useAdminServiceRequests = () => {
  const requests = ref<ServiceRequestWithRelations[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const pagination = ref({ total: 0, page: 1, limit: 20, pages: 0 })
  const stats = ref<Record<string, number>>({})
  
  const fetchAllRequests = async (filters?: ServiceRequestFilters) => {
    loading.value = true
    error.value = null
    
    try {
      // Verify admin access using better-auth
      const { data: role } = await authClient.organization.getActiveMemberRole()
      const isAdmin = role?.includes('owner') || role?.includes('admin')
      
      if (!isAdmin) {
        throw new Error('Admin access required')
      }
      
      const response = await $fetch('/api/service-requests/admin', {
        query: filters
      })
      requests.value = response.requests
      pagination.value = response.pagination
      stats.value = response.stats
    } catch (e: any) {
      error.value = e.message
      console.error('Error fetching admin service requests:', e)
    } finally {
      loading.value = false
    }
  }
  
  const adminUpdateRequest = async (
    id: string,
    data: AdminServiceRequestUpdateInput
  ) => {
    loading.value = true
    error.value = null
    
    try {
      const updated = await $fetch(`/api/service-requests/admin/${id}`, {
        method: 'PATCH',
        body: data
      })
      const index = requests.value.findIndex(r => r.id === id)
      if (index !== -1) {
        requests.value[index] = updated
      }
      return updated
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }
  
  const assignRequest = async (id: string, userId: string) => {
    return adminUpdateRequest(id, { assignedToId: userId })
  }
  
  const resolveRequest = async (id: string) => {
    return adminUpdateRequest(id, { status: 'RESOLVED' })
  }
  
  const closeRequest = async (id: string) => {
    return adminUpdateRequest(id, { status: 'CLOSED' })
  }
  
  const reopenRequest = async (id: string) => {
    return adminUpdateRequest(id, { status: 'OPEN' })
  }
  
  return {
    requests: readonly(requests),
    loading: readonly(loading),
    error: readonly(error),
    pagination: readonly(pagination),
    stats: readonly(stats),
    fetchAllRequests,
    adminUpdateRequest,
    assignRequest,
    resolveRequest,
    closeRequest,
    reopenRequest
  }
}
```

## Phase 10: Customer Components

### 10.1 Status Badge Component

Create `layers/service-requests/app/components/ServiceRequest/StatusBadge.vue`:
```vue
<template>
  <UBadge :color="statusColor" :variant="variant">
    {{ statusLabel }}
  </UBadge>
</template>

<script setup lang="ts">
const props = defineProps<{
  status: ServiceRequestStatus
  variant?: 'solid' | 'outline' | 'soft'
}>()

const statusColor = computed(() => {
  switch (props.status) {
    case 'OPEN': return 'blue'
    case 'IN_PROGRESS': return 'yellow'
    case 'RESOLVED': return 'green'
    case 'CLOSED': return 'gray'
    default: return 'gray'
  }
})

const { t } = useI18n()

const statusLabel = computed(() => {
  return t(`serviceRequest.status.${props.status.toLowerCase()}`)
})
</script>
```

### 10.2 Customer Request Form Component

Create `layers/service-requests/app/components/ServiceRequest/CustomerRequestForm.vue`:
```vue
<template>
  <UForm :state="state" :schema="schema" @submit="handleSubmit">
    <UFormField label="Title" name="title" required>
      <UInput v-model="state.title" placeholder="Brief description of your request" />
    </UFormField>
    
    <UFormField label="Description" name="description" required>
      <UTextarea 
        v-model="state.description" 
        placeholder="Provide detailed information about your request"
        :rows="6"
      />
    </UFormField>
    
    <UFormField label="Priority" name="priority">
      <USelect 
        v-model="state.priority" 
        :options="priorityOptions"
      />
    </UFormField>
    
    <UFormField label="Category" name="category">
      <UInput v-model="state.category" placeholder="e.g., Technical, Billing, General" />
    </UFormField>
    
    <div class="flex gap-2">
      <UButton type="submit" :loading="loading">
        {{ editMode ? 'Update Request' : 'Submit Request' }}
      </UButton>
      <UButton variant="ghost" @click="$emit('cancel')">
        Cancel
      </UButton>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { z } from 'zod'

const props = defineProps<{
  initialData?: Partial<ServiceRequest>
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [data: ServiceRequestCreateInput]
  cancel: []
}>()

const editMode = computed(() => !!props.initialData?.id)

const state = reactive({
  title: props.initialData?.title || '',
  description: props.initialData?.description || '',
  priority: props.initialData?.priority || 'MEDIUM',
  category: props.initialData?.category || ''
})

const schema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  category: z.string().max(100).optional()
})

const priorityOptions = [
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
  { label: 'Urgent', value: 'URGENT' }
]

const handleSubmit = () => {
  emit('submit', state)
}
</script>
```

### 10.3 Customer Request List Component

Create `layers/service-requests/app/components/ServiceRequest/CustomerRequestList.vue`:
```vue
<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h2 class="text-2xl font-bold">My Service Requests</h2>
      <UButton @click="$emit('create')">
        New Request
      </UButton>
    </div>
    
    <!-- Filters -->
    <div class="flex gap-2">
      <USelect 
        v-model="filters.status" 
        :options="statusOptions"
        placeholder="Filter by status"
      />
      <USelect 
        v-model="filters.priority" 
        :options="priorityOptions"
        placeholder="Filter by priority"
      />
      <UInput 
        v-model="filters.search" 
        placeholder="Search requests..."
        icon="i-lucide-search"
      />
    </div>
    
    <!-- List -->
    <div v-if="loading" class="text-center py-8">
      <USpinner />
    </div>
    
    <div v-else-if="requests.length === 0" class="text-center py-8 text-gray-500">
      No service requests found
    </div>
    
    <div v-else class="space-y-3">
      <UCard 
        v-for="request in requests" 
        :key="request.id"
        class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
        @click="$emit('select', request.id)"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h3 class="font-semibold">{{ request.title }}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
              {{ request.description }}
            </p>
            <div class="flex gap-2 mt-2 text-xs text-gray-500">
              <span>{{ formatDate(request.createdAt) }}</span>
              <span v-if="request.category">• {{ request.category }}</span>
            </div>
          </div>
          <div class="flex flex-col items-end gap-2">
            <ServiceRequestStatusBadge :status="request.status" />
            <UBadge :color="getPriorityColor(request.priority)" variant="soft" size="xs">
              {{ request.priority }}
            </UBadge>
          </div>
        </div>
      </UCard>
    </div>
    
    <!-- Pagination -->
    <div v-if="pagination.pages > 1" class="flex justify-center">
      <UPagination 
        v-model="currentPage"
        :total="pagination.total"
        :page-size="pagination.limit"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  requests: ServiceRequestWithRelations[]
  loading: boolean
  pagination: any
}>()

const emit = defineEmits<{
  create: []
  select: [id: string]
  filter: [filters: ServiceRequestFilters]
}>()

const currentPage = ref(1)
const filters = reactive({
  status: undefined,
  priority: undefined,
  search: ''
})

watch(filters, () => {
  emit('filter', filters)
})

watch(currentPage, (page) => {
  emit('filter', { ...filters, page })
})

// ... options and helper functions
</script>
```

### 10.4 Customer Request Detail Component

Create `layers/service-requests/app/components/ServiceRequest/CustomerRequestDetail.vue`:
```vue
<template>
  <div v-if="request" class="space-y-6">
    <div class="flex justify-between items-start">
      <div>
        <h1 class="text-3xl font-bold">{{ request.title }}</h1>
        <div class="flex gap-2 mt-2">
          <ServiceRequestStatusBadge :status="request.status" />
          <UBadge :color="getPriorityColor(request.priority)">
            {{ request.priority }}
          </UBadge>
          <UBadge v-if="request.category" variant="soft">
            {{ request.category }}
          </UBadge>
        </div>
      </div>
      
      <div class="flex gap-2">
        <UButton 
          v-if="canEdit" 
          variant="ghost" 
          @click="$emit('edit')"
        >
          Edit
        </UButton>
        <UButton 
          v-if="canDelete" 
          variant="ghost" 
          color="red"
          @click="$emit('delete')"
        >
          Delete
        </UButton>
      </div>
    </div>
    
    <UDivider />
    
    <div class="prose dark:prose-invert max-w-none">
      <h3>Description</h3>
      <p>{{ request.description }}</p>
    </div>
    
    <UDivider />
    
    <div class="grid grid-cols-2 gap-4 text-sm">
      <div>
        <span class="font-semibold">Created by:</span>
        {{ request.createdBy.name || request.createdBy.email }}
      </div>
      <div>
        <span class="font-semibold">Created at:</span>
        {{ formatDate(request.createdAt) }}
      </div>
      <div v-if="request.assignedTo">
        <span class="font-semibold">Assigned to:</span>
        {{ request.assignedTo.name || request.assignedTo.email }}
      </div>
      <div v-if="request.resolvedAt">
        <span class="font-semibold">Resolved at:</span>
        {{ formatDate(request.resolvedAt) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  request: ServiceRequestWithRelations
  canEdit?: boolean
  canDelete?: boolean
}>()

const emit = defineEmits<{
  edit: []
  delete: []
}>()

// Helper functions
</script>
```

## Phase 11: Admin Components

### 11.1 Admin Request Dashboard Component

Create `layers/service-requests/app/components/ServiceRequest/AdminRequestDashboard.vue`:
```vue
<template>
  <div class="space-y-6">
    <!-- Stats Overview -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <UCard>
        <div class="text-center">
          <div class="text-3xl font-bold text-blue-600">{{ stats.OPEN || 0 }}</div>
          <div class="text-sm text-gray-600">Open</div>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <div class="text-3xl font-bold text-yellow-600">{{ stats.IN_PROGRESS || 0 }}</div>
          <div class="text-sm text-gray-600">In Progress</div>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <div class="text-3xl font-bold text-green-600">{{ stats.RESOLVED || 0 }}</div>
          <div class="text-sm text-gray-600">Resolved</div>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <div class="text-3xl font-bold text-gray-600">{{ stats.CLOSED || 0 }}</div>
          <div class="text-sm text-gray-600">Closed</div>
        </div>
      </UCard>
    </div>
    
    <!-- Filters and Table -->
    <AdminRequestTable 
      :requests="requests"
      :loading="loading"
      :pagination="pagination"
      @select="$emit('select', $event)"
      @filter="$emit('filter', $event)"
      @update="$emit('update', $event)"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  requests: ServiceRequestWithRelations[]
  loading: boolean
  pagination: any
  stats: Record<string, number>
}>()

const emit = defineEmits<{
  select: [id: string]
  filter: [filters: ServiceRequestFilters]
  update: [data: { id: string, updates: AdminServiceRequestUpdateInput }]
}>()
</script>
```

### 11.2 Admin Request Table Component

Create `layers/service-requests/app/components/ServiceRequest/AdminRequestTable.vue`:
```vue
<template>
  <UCard>
    <!-- Filters -->
    <div class="flex gap-2 mb-4">
      <USelect v-model="filters.status" :options="statusOptions" placeholder="Status" />
      <USelect v-model="filters.priority" :options="priorityOptions" placeholder="Priority" />
      <UInput v-model="filters.search" placeholder="Search..." icon="i-lucide-search" />
    </div>
    
    <!-- Table -->
    <UTable 
      :rows="requests" 
      :columns="columns"
      :loading="loading"
      @select="$emit('select', $event.id)"
    >
      <template #title-data="{ row }">
        <div class="cursor-pointer hover:underline" @click="$emit('select', row.id)">
          {{ row.title }}
        </div>
      </template>
      
      <template #status-data="{ row }">
        <ServiceRequestStatusBadge :status="row.status" />
      </template>
      
      <template #priority-data="{ row }">
        <UBadge :color="getPriorityColor(row.priority)" size="xs">
          {{ row.priority }}
        </UBadge>
      </template>
      
      <template #organization-data="{ row }">
        {{ row.organization.name }}
      </template>
      
      <template #assignedTo-data="{ row }">
        <span v-if="row.assignedTo">
          {{ row.assignedTo.name || row.assignedTo.email }}
        </span>
        <UButton 
          v-else 
          size="xs" 
          variant="ghost"
          @click="$emit('assign', row.id)"
        >
          Assign
        </UButton>
      </template>
      
      <template #actions-data="{ row }">
        <UDropdown :items="getActions(row)">
          <UButton variant="ghost" icon="i-lucide-more-vertical" />
        </UDropdown>
      </template>
    </UTable>
    
    <!-- Pagination -->
    <div v-if="pagination.pages > 1" class="flex justify-center mt-4">
      <UPagination 
        v-model="currentPage"
        :total="pagination.total"
        :page-size="pagination.limit"
      />
    </div>
  </UCard>
</template>

<script setup lang="ts">
const props = defineProps<{
  requests: ServiceRequestWithRelations[]
  loading: boolean
  pagination: any
}>()

const emit = defineEmits<{
  select: [id: string]
  filter: [filters: ServiceRequestFilters]
  assign: [id: string]
  update: [data: { id: string, updates: AdminServiceRequestUpdateInput }]
}>()

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'organization', label: 'Organization' },
  { key: 'assignedTo', label: 'Assigned To' },
  { key: 'createdAt', label: 'Created' },
  { key: 'actions', label: '' }
]

const getActions = (request: ServiceRequestWithRelations) => {
  return [[
    { label: 'View', click: () => emit('select', request.id) },
    { label: 'Assign', click: () => emit('assign', request.id) },
    { label: 'Resolve', click: () => emit('update', { id: request.id, updates: { status: 'RESOLVED' } }) },
    { label: 'Close', click: () => emit('update', { id: request.id, updates: { status: 'CLOSED' } }) }
  ]]
}

// ... filters and helper functions
</script>
```

## Phase 12: Customer Pages

### 12.1 Customer Request List Page

Create `layers/service-requests/app/pages/requests/index.vue`:
```vue
<template>
  <div class="container mx-auto py-8">
    <CustomerRequestList 
      :requests="requests"
      :loading="loading"
      :pagination="pagination"
      @create="navigateTo('/requests/new')"
      @select="navigateTo(`/requests/${$event}`)"
      @filter="handleFilter"
    />
  </div>
</template>

<script setup lang="ts">
const { 
  requests, 
  loading, 
  pagination, 
  fetchRequests 
} = useServiceRequests()

onMounted(() => {
  fetchRequests()
})

const handleFilter = (filters: ServiceRequestFilters) => {
  fetchRequests(filters)
}

definePageMeta({
  middleware: 'auth'
})
</script>
```

### 12.2 Create Request Page

Create `layers/service-requests/app/pages/requests/new.vue`:
```vue
<template>
  <div class="container mx-auto py-8 max-w-2xl">
    <h1 class="text-3xl font-bold mb-6">Create Service Request</h1>
    
    <CustomerRequestForm 
      :loading="loading"
      @submit="handleSubmit"
      @cancel="navigateTo('/requests')"
    />
  </div>
</template>

<script setup lang="ts">
const { createRequest, loading } = useServiceRequests()
const toast = useToast()

const handleSubmit = async (data: ServiceRequestCreateInput) => {
  try {
    await createRequest(data)
    toast.add({
      title: 'Success',
      description: 'Service request created successfully'
    })
    navigateTo('/requests')
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to create service request',
      color: 'red'
    })
  }
}

definePageMeta({
  middleware: 'auth'
})
</script>
```

### 12.3 Request Detail Page

Create `layers/service-requests/app/pages/requests/[id].vue`:
```vue
<template>
  <div class="container mx-auto py-8 max-w-4xl">
    <div v-if="loading" class="text-center py-8">
      <USpinner />
    </div>
    
    <div v-else-if="!request" class="text-center py-8">
      <p>Request not found</p>
      <UButton @click="navigateTo('/requests')">Back to Requests</UButton>
    </div>
    
    <div v-else>
      <CustomerRequestDetail 
        :request="request"
        :can-edit="canEdit"
        :can-delete="canDelete"
        @edit="showEditModal = true"
        @delete="handleDelete"
      />
      
      <!-- Edit Modal -->
      <UModal v-model="showEditModal">
        <UCard>
          <template #header>
            <h2 class="text-xl font-bold">Edit Request</h2>
          </template>
          
          <CustomerRequestForm 
            :initial-data="request"
            :loading="updating"
            @submit="handleUpdate"
            @cancel="showEditModal = false"
          />
        </UCard>
      </UModal>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const requestId = route.params.id as string

const { getRequest, updateRequest, deleteRequest } = useServiceRequests()
const userStore = useUserStore()
const toast = useToast()

const request = ref<ServiceRequestWithRelations | null>(null)
const loading = ref(true)
const updating = ref(false)
const showEditModal = ref(false)

const canEdit = computed(() => {
  return request.value?.createdById === userStore.currentUser?.id
})

const canDelete = computed(() => {
  return request.value?.createdById === userStore.currentUser?.id
})

onMounted(async () => {
  try {
    request.value = await getRequest(requestId)
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to load request',
      color: 'red'
    })
  } finally {
    loading.value = false
  }
})

const handleUpdate = async (data: ServiceRequestUpdateInput) => {
  updating.value = true
  try {
    request.value = await updateRequest(requestId, data)
    showEditModal.value = false
    toast.add({
      title: 'Success',
      description: 'Request updated successfully'
    })
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to update request',
      color: 'red'
    })
  } finally {
    updating.value = false
  }
}

const handleDelete = async () => {
  if (!confirm('Are you sure you want to delete this request?')) return
  
  try {
    await deleteRequest(requestId)
    toast.add({
      title: 'Success',
      description: 'Request deleted successfully'
    })
    navigateTo('/requests')
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to delete request',
      color: 'red'
    })
  }
}

definePageMeta({
  middleware: 'auth'
})
</script>
```

## Phase 13: Admin Pages

### 13.1 Admin Request List Page

Create `layers/service-requests/app/pages/admin/requests/index.vue`:
```vue
<template>
  <div class="container mx-auto py-8">
    <h1 class="text-3xl font-bold mb-6">Service Requests Management</h1>
    
    <AdminRequestDashboard 
      :requests="requests"
      :loading="loading"
      :pagination="pagination"
      :stats="stats"
      @select="navigateTo(`/admin/requests/${$event}`)"
      @filter="handleFilter"
      @update="handleUpdate"
    />
  </div>
</template>

<script setup lang="ts">
const { 
  requests, 
  loading, 
  pagination,
  stats,
  fetchAllRequests,
  adminUpdateRequest
} = useAdminServiceRequests()

const toast = useToast()

onMounted(() => {
  fetchAllRequests()
})

const handleFilter = (filters: ServiceRequestFilters) => {
  fetchAllRequests(filters)
}

const handleUpdate = async ({ id, updates }: { id: string, updates: AdminServiceRequestUpdateInput }) => {
  try {
    await adminUpdateRequest(id, updates)
    toast.add({
      title: 'Success',
      description: 'Request updated successfully'
    })
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to update request',
      color: 'red'
    })
  }
}

definePageMeta({
  middleware: ['auth', 'admin']
})
</script>
```

### 13.2 Admin Request Detail Page

Create `layers/service-requests/app/pages/admin/requests/[id].vue`:
```vue
<template>
  <div class="container mx-auto py-8 max-w-4xl">
    <div v-if="loading">
      <USpinner />
    </div>
    
    <div v-else-if="request" class="space-y-6">
      <!-- Full request details with admin controls -->
      <CustomerRequestDetail :request="request" />
      
      <UDivider />
      
      <!-- Admin Actions -->
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Admin Actions</h3>
        </template>
        
        <div class="space-y-4">
          <UFormField label="Status">
            <USelect 
              v-model="adminUpdates.status" 
              :options="statusOptions"
              @change="handleQuickUpdate"
            />
          </UFormField>
          
          <UFormField label="Priority">
            <USelect 
              v-model="adminUpdates.priority" 
              :options="priorityOptions"
              @change="handleQuickUpdate"
            />
          </UFormField>
          
          <UFormField label="Assign To">
            <USelect 
              v-model="adminUpdates.assignedToId" 
              :options="userOptions"
              @change="handleQuickUpdate"
            />
          </UFormField>
          
          <UFormField label="Internal Notes">
            <UTextarea 
              v-model="adminUpdates.internalNotes"
              :rows="4"
              placeholder="Notes visible only to admins..."
            />
          </UFormField>
          
          <UButton @click="handleUpdate" :loading="updating">
            Save Changes
          </UButton>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const requestId = route.params.id as string

const { adminUpdateRequest } = useAdminServiceRequests()
const toast = useToast()

const request = ref<ServiceRequestWithRelations | null>(null)
const loading = ref(true)
const updating = ref(false)

const adminUpdates = reactive({
  status: '',
  priority: '',
  assignedToId: '',
  internalNotes: ''
})

onMounted(async () => {
  try {
    request.value = await $fetch(`/api/service-requests/${requestId}`)
    adminUpdates.status = request.value.status
    adminUpdates.priority = request.value.priority
    adminUpdates.assignedToId = request.value.assignedToId || ''
    adminUpdates.internalNotes = request.value.internalNotes || ''
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to load request',
      color: 'red'
    })
  } finally {
    loading.value = false
  }
})

const handleUpdate = async () => {
  updating.value = true
  try {
    request.value = await adminUpdateRequest(requestId, adminUpdates)
    toast.add({
      title: 'Success',
      description: 'Request updated successfully'
    })
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to update request',
      color: 'red'
    })
  } finally {
    updating.value = false
  }
}

definePageMeta({
  middleware: ['auth', 'admin']
})
</script>
```

## Phase 14: Internationalization

### 14.1 English Translations

Create `layers/service-requests/i18n/locales/en.json`:
```json
{
  "serviceRequest": {
    "title": "Service Requests",
    "create": "Create Request",
    "edit": "Edit Request",
    "delete": "Delete Request",
    "status": {
      "open": "Open",
      "in_progress": "In Progress",
      "resolved": "Resolved",
      "closed": "Closed"
    },
    "priority": {
      "low": "Low",
      "medium": "Medium",
      "high": "High",
      "urgent": "Urgent"
    },
    "fields": {
      "title": "Title",
      "description": "Description",
      "priority": "Priority",
      "category": "Category",
      "status": "Status",
      "createdBy": "Created By",
      "assignedTo": "Assigned To",
      "createdAt": "Created At",
      "updatedAt": "Updated At",
      "resolvedAt": "Resolved At"
    },
    "messages": {
      "createSuccess": "Service request created successfully",
      "updateSuccess": "Service request updated successfully",
      "deleteSuccess": "Service request deleted successfully",
      "createError": "Failed to create service request",
      "updateError": "Failed to update service request",
      "deleteError": "Failed to delete service request"
    }
  }
}
```

### 14.2 Dutch Translations

Create `layers/service-requests/i18n/locales/nl.json`:
```json
{
  "serviceRequest": {
    "title": "Serviceaanvragen",
    "create": "Aanvraag Maken",
    "edit": "Aanvraag Bewerken",
    "delete": "Aanvraag Verwijderen",
    "status": {
      "open": "Open",
      "in_progress": "In Behandeling",
      "resolved": "Opgelost",
      "closed": "Gesloten"
    },
    "priority": {
      "low": "Laag",
      "medium": "Gemiddeld",
      "high": "Hoog",
      "urgent": "Urgent"
    },
    "fields": {
      "title": "Titel",
      "description": "Beschrijving",
      "priority": "Prioriteit",
      "category": "Categorie",
      "status": "Status",
      "createdBy": "Gemaakt Door",
      "assignedTo": "Toegewezen Aan",
      "createdAt": "Gemaakt Op",
      "updatedAt": "Bijgewerkt Op",
      "resolvedAt": "Opgelost Op"
    },
    "messages": {
      "createSuccess": "Serviceaanvraag succesvol aangemaakt",
      "updateSuccess": "Serviceaanvraag succesvol bijgewerkt",
      "deleteSuccess": "Serviceaanvraag succesvol verwijderd",
      "createError": "Serviceaanvraag maken mislukt",
      "updateError": "Serviceaanvraag bijwerken mislukt",
      "deleteError": "Serviceaanvraag verwijderen mislukt"
    }
  }
}
```

## Phase 15: Integration with Main Application

### 15.1 Extend Layer in Main Config

Update `nuxt.config.ts` in main application:
```typescript
export default defineNuxtConfig({
  extends: [
    './layers/service-requests'
  ],
  // ... other config
})
```

### 15.2 Expose Menu Options from Service Requests Layer

Create `layers/service-requests/app/composables/useServiceRequestMenu.ts`:
```typescript
import { authClient } from '~~/lib/auth-client'

export const useServiceRequestMenu = () => {
  const { data: role } = authClient.organization.getActiveMemberRole()
  const isOrganizationAdmin = computed(() => 
    role?.includes('owner') || role?.includes('admin')
  )

  const menuItems = computed(() => {
    const items = [
      {
        label: 'My Requests',
        to: '/requests',
        icon: 'i-lucide-ticket'
      }
    ]

    if (isOrganizationAdmin.value) {
      items.push({
        label: 'Manage Requests',
        to: '/admin/requests',
        icon: 'i-lucide-settings'
      })
    }

    return items
  })

  return {
    menuItems: readonly(menuItems),
    isOrganizationAdmin: readonly(isOrganizationAdmin)
  }
}
```

### 15.3 Update Main App Header to Use Service Request Menu

Update `app/components/AppHeader.vue`:
```vue
<template>
  <nav>
    <!-- Existing navigation items -->
    
    <!-- Service Request Menu Items (only if layer is present) -->
    <template v-if="isAuthenticated && serviceRequestMenu">
      <NuxtLink 
        v-for="item in serviceRequestMenu.menuItems" 
        :key="item.to"
        :to="item.to"
        class="nav-link"
      >
        <UIcon :name="item.icon" />
        {{ item.label }}
      </NuxtLink>
    </template>
  </nav>
</template>

<script setup>
// Try to use service request menu composable (will be undefined if layer not present)
const serviceRequestMenu = useServiceRequestMenu?.() || null
</script>
```

### 15.4 Add Dashboard Widget

Update `app/pages/dashboard.vue`:
```vue
<template>
  <div class="space-y-6">
    <!-- Existing dashboard content -->
    
    <!-- Service Requests Widget (only if layer is present) -->
    <UCard v-if="serviceRequestWidget">
      <template #header>
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-bold">Recent Service Requests</h2>
          <NuxtLink to="/requests">
            <UButton variant="ghost" size="xs">View All</UButton>
          </NuxtLink>
        </div>
      </template>
      
      <RecentServiceRequestsWidget />
    </UCard>
  </div>
</template>

<script setup>
// Try to use service request widget (will be undefined if layer not present)
const serviceRequestWidget = useServiceRequestWidget?.() || null
</script>
```

### 15.5 Create Service Request Widget Composable

Create `layers/service-requests/app/composables/useServiceRequestWidget.ts`:
```typescript
import { authClient } from '~~/lib/auth-client'

export const useServiceRequestWidget = () => {
  const { requests, loading, fetchRequests } = useServiceRequests()

  const initializeWidget = async () => {
    try {
      const { data: member } = await authClient.organization.getActiveMember()
      if (member?.organizationId) {
        await fetchRequests({ limit: 5 })
      }
    } catch (error) {
      console.error('Failed to check organization membership:', error)
    }
  }

  return {
    requests: readonly(requests),
    loading: readonly(loading),
    initializeWidget
  }
}
```

### 15.6 Create Recent Service Requests Widget

Create `app/components/RecentServiceRequestsWidget.vue`:
```vue
<template>
  <div class="space-y-2">
    <div v-if="loading">
      <USpinner />
    </div>
    
    <div v-else-if="requests.length === 0">
      <p class="text-gray-500 text-center py-4">No recent requests</p>
      <UButton @click="navigateTo('/requests/new')" block>
        Create Your First Request
      </UButton>
    </div>
    
    <div v-else class="space-y-2">
      <div 
        v-for="request in requests.slice(0, 5)" 
        :key="request.id"
        class="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-900 rounded cursor-pointer"
        @click="navigateTo(`/requests/${request.id}`)"
      >
        <div>
          <p class="font-medium">{{ request.title }}</p>
          <p class="text-xs text-gray-500">{{ formatDate(request.createdAt) }}</p>
        </div>
        <ServiceRequestStatusBadge :status="request.status" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Try to use service request widget composable (will be undefined if layer not present)
const widget = useServiceRequestWidget?.()

if (widget) {
  const { requests, loading, initializeWidget } = widget
  
  onMounted(() => {
    initializeWidget()
  })
} else {
  // Fallback if service request layer is not present
  const requests = ref([])
  const loading = ref(false)
}
</script>
```

## Technical Considerations

### Layer Independence
- Service requests layer is self-contained
- Only depends on better-auth organization system from main layer
- Can be easily removed by deleting layer directory and removing from nuxt.config

### Security
- Organization-based access control using better-auth organization membership
- Ownership verification for updates/deletes
- Better-auth organization role checks for admin endpoints
- Internal notes hidden from non-admin users using better-auth roles

### Performance
- Indexed queries on organizationId, status, createdAt
- Pagination on all list endpoints
- Lazy loading of components
- Optimistic UI updates where appropriate

### Extensibility
- Easy to add custom fields via metadata JSON
- Category system can be expanded to taxonomy
- Attachments field ready for file upload implementation
- Internal notes for future comment system

## Files to Create

**Layer Structure:**
- `layers/service-requests/nuxt.config.ts`
- `layers/service-requests/prisma/service-requests.prisma`
- `layers/service-requests/app/types/service-request.d.ts`

**Server:**
- `layers/service-requests/server/utils/service-request-validation.ts`
- `layers/service-requests/server/utils/service-request-helpers.ts`
- `layers/service-requests/server/api/service-requests/index.get.ts`
- `layers/service-requests/server/api/service-requests/index.post.ts`
- `layers/service-requests/server/api/service-requests/[id].get.ts`
- `layers/service-requests/server/api/service-requests/[id].patch.ts`
- `layers/service-requests/server/api/service-requests/[id].delete.ts`
- `layers/service-requests/server/api/service-requests/admin/index.get.ts`
- `layers/service-requests/server/api/service-requests/admin/[id].patch.ts`

**Composables:**
- `layers/service-requests/app/composables/useServiceRequests.ts`
- `layers/service-requests/app/composables/useAdminServiceRequests.ts`
- `layers/service-requests/app/composables/useServiceRequestMenu.ts`
- `layers/service-requests/app/composables/useServiceRequestWidget.ts`

**Components:**
- `layers/service-requests/app/components/ServiceRequest/StatusBadge.vue`
- `layers/service-requests/app/components/ServiceRequest/CustomerRequestForm.vue`
- `layers/service-requests/app/components/ServiceRequest/CustomerRequestList.vue`
- `layers/service-requests/app/components/ServiceRequest/CustomerRequestDetail.vue`
- `layers/service-requests/app/components/ServiceRequest/AdminRequestDashboard.vue`
- `layers/service-requests/app/components/ServiceRequest/AdminRequestTable.vue`

**Pages:**
- `layers/service-requests/app/pages/requests/index.vue`
- `layers/service-requests/app/pages/requests/new.vue`
- `layers/service-requests/app/pages/requests/[id].vue`
- `layers/service-requests/app/pages/admin/requests/index.vue`
- `layers/service-requests/app/pages/admin/requests/[id].vue`

**i18n:**
- `layers/service-requests/i18n/locales/en.json`
- `layers/service-requests/i18n/locales/nl.json`

**Main App Integration:**
- Update `nuxt.config.ts`
- Update `app/components/AppHeader.vue`
- Update `app/pages/dashboard.vue`
- Create `app/components/RecentServiceRequestsWidget.vue`
- Update `prisma/schema.prisma` (add relations)
- Create `prisma.config.ts` (for multi-file schema configuration)

## Testing

1. Unit tests for composables
2. API endpoint tests with organization isolation
3. Component tests for forms and lists
4. E2E tests for complete workflows
5. Permission tests
6. Cross-organization access prevention tests

## Future Enhancements (Out of Scope)

- File attachments
- Comment/discussion threads
- Email notifications
- Real-time updates via WebSockets
- SLA tracking
- Custom fields per organization
- Request templates
- Advanced analytics dashboard
- Mobile app support

## To-dos

- [ ] Create service requests layer directory structure
- [ ] Define ServiceRequest Prisma schema in layer using multi-file schema (using existing better-auth Organization model)
- [ ] Build customer-facing Vue components (form, list, detail, badge)
- [ ] Create customer pages for listing, creating, and viewing requests
- [ ] Implement useServiceRequests composable for customer operations (using better-auth organization client)
- [ ] Build admin-specific components (dashboard, table, detail)
- [ ] Create admin pages for managing all requests
- [ ] Implement useAdminServiceRequests composable for admin operations (using better-auth organization roles)
- [ ] Implement customer API endpoints with better-auth organization validation
- [ ] Implement admin API endpoints with better-auth organization role-based access
- [ ] Update main nuxt.config.ts to extend service requests layer
- [ ] Create useServiceRequestMenu composable to expose menu options
- [ ] Create useServiceRequestWidget composable for dashboard widget
- [ ] Update AppHeader to conditionally use service request menu
- [ ] Update dashboard to conditionally show service request widget
- [ ] Add internationalization keys for service requests in layer locale files
- [ ] Create and run database migrations for service requests (extending existing better-auth schema)
- [ ] Create prisma.config.ts for multi-file schema configuration
