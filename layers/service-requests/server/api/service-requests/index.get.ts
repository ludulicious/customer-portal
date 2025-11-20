import { auth } from '~~/server/utils/auth'
import { filterServiceRequestSchema } from '../../utils/service-request-validation'
import { buildRequestQuery, verifyServiceRequestAccess } from '../../utils/service-request-helpers'
import { db } from '~~/server/utils/db'
import { and, desc, eq } from 'drizzle-orm'
import { serviceRequest } from '~~/server/db/schema/service-requests'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const query = getQuery(event)
  const filters = filterServiceRequestSchema.parse(query)

  // Get user's active organization from session
  type SessionWithOrg = { session?: { activeOrganizationId?: string }, activeOrganizationId?: string }
  const sessionWithOrg = session as SessionWithOrg
  const organizationId = sessionWithOrg?.session?.activeOrganizationId || sessionWithOrg?.activeOrganizationId

  if (!organizationId) {
    throw createError({ statusCode: 400, message: 'No organization found' })
  }

  // Verify user has permission to list service requests
  const hasAccess = await verifyServiceRequestAccess(session, organizationId, 'list')
  if (!hasAccess) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  const where = and(eq(serviceRequest.organizationId, organizationId), buildRequestQuery(filters))

  const [requests, total] = await Promise.all([
    db
      .select()
      .from(serviceRequest)
      .where(where)
      .orderBy(desc(serviceRequest.createdAt))
      .offset(((filters.page || 1) - 1) * (filters.limit || 20))
      .limit(filters.limit || 20),
    db
      .select({ count: serviceRequest.id })
      .from(serviceRequest)
      .where(where)
      .then(rows => rows.length),
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
