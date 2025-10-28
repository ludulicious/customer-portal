import { authClient } from '~~/lib/auth-client'
import { filterServiceRequestSchema } from '../../../utils/service-request-validation'
import { buildRequestQuery } from '../../../utils/service-request-helpers'
import { prisma } from '~~/lib/db'

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
