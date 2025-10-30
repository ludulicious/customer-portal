import { authClient } from '~~/lib/auth-client'
import { filterServiceRequestSchema } from '../../../utils/service-request-validation'
import { buildRequestQuery } from '../../../utils/service-request-helpers'
import { db } from '~~/lib/db'
import { desc } from 'drizzle-orm'
import { serviceRequest } from '~~/db/schema/service-requests'
import { defineEventHandler, createError, getQuery } from 'h3'

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

  const query = getQuery(event)
  const filters = filterServiceRequestSchema.parse(query)

  const where = buildRequestQuery(filters)

  const [requests, total, statsRows] = await Promise.all([
    db
      .select()
      .from(serviceRequest)
      .where(where as any)
      .orderBy(desc(serviceRequest.createdAt))
      .offset(((filters.page || 1) - 1) * (filters.limit || 20))
      .limit(filters.limit || 20),
    db
      .select({ count: serviceRequest.id })
      .from(serviceRequest)
      .where(where as any)
      .then(rows => rows.length),
    db
      .select({ status: serviceRequest.status })
      .from(serviceRequest)
      .where(where as any)
  ])

  return {
    requests,
    pagination: {
      total,
      page: filters.page || 1,
      limit: filters.limit || 20,
      pages: Math.ceil(total / (filters.limit || 20))
    },
    stats: statsRows.reduce((acc, item) => {
      acc[item.status as string] = (acc[item.status as string] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
  }
})
