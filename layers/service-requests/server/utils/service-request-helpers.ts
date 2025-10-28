import { authClient } from '~~/lib/auth-client'
import { prisma } from '~~/lib/db'

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
