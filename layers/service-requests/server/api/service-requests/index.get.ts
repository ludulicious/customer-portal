import { authClient } from '~~/lib/auth-client'
import { filterServiceRequestSchema } from '../../utils/service-request-validation'
import { buildRequestQuery } from '../../utils/service-request-helpers'
import { prisma } from '~~/lib/db'

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
