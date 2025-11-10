import { authClient } from '~/utils/auth-client'
import { filterServiceRequestSchema } from '../../utils/service-request-validation'
import { buildRequestQuery } from '../../utils/service-request-helpers'
import { db } from '~~/server/utils/db'
import { and, desc, eq } from 'drizzle-orm'
import { serviceRequest } from '~~/server/db/schema/service-requests'
import { defineEventHandler, createError, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const session = await authClient.getSession()
  if (!session?.data?.user) {
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
