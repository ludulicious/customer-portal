import { authClient } from '~~/lib/auth-client'
import { adminUpdateServiceRequestSchema } from '../../../utils/service-request-validation'
import { db } from '~~/lib/db'
import { eq } from 'drizzle-orm'
import { serviceRequest } from '~~/db/schema/service-requests'

export default defineEventHandler(async (event) => {
  const session = await authClient.getSession()
  if (!session?.data?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Check if user is admin using better-auth organization roles
  const { data: role } = await authClient.organization.getActiveMemberRole()
  const isAdmin = role?.role === 'owner' || role?.role === 'admin'

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

  const [request] = await db
    .update(serviceRequest)
    .set(updateData)
    .where(eq(serviceRequest.id, id!))
    .returning()

  return request
})
