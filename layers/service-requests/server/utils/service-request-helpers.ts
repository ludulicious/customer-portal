import { authClient } from '~~/lib/auth-client'
import { db } from '~~/lib/db'
import { eq, and, ilike } from 'drizzle-orm'
import { serviceRequest } from '~~/db/schema/service-requests'

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
    return role?.role === 'owner' || role?.role === 'admin'
  } catch {
    return false
  }
}

export async function verifyRequestOwnership(
  userId: string,
  requestId: string
): Promise<boolean> {
  const [row] = await db
    .select({ createdById: serviceRequest.createdById })
    .from(serviceRequest)
    .where(eq(serviceRequest.id, requestId))
    .limit(1)
  return row?.createdById === userId
}

export function buildRequestQuery(filters: any) {
  const conditions = [] as any[]
  if (filters.status) conditions.push(eq(serviceRequest.status, filters.status))
  if (filters.priority) conditions.push(eq(serviceRequest.priority, filters.priority))
  if (filters.category) conditions.push(eq(serviceRequest.category, filters.category))
  if (filters.assignedToId) conditions.push(eq(serviceRequest.assignedToId, filters.assignedToId))
  if (filters.createdById) conditions.push(eq(serviceRequest.createdById, filters.createdById))
  if (filters.search) {
    conditions.push(
      ilike(serviceRequest.title, `%${filters.search}%`) as any
    )
  }
  return conditions.length ? and(...conditions) : undefined
}
