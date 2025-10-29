import { authClient } from '~~/lib/auth-client'
import { updateServiceRequestSchema } from '../../utils/service-request-validation'
import { verifyRequestOwnership } from '../../utils/service-request-helpers'
import { prisma } from '~~/lib/db'

export default defineEventHandler(async (event) => {
  const session = await authClient.getSession()
  if (!session?.data?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const data = updateServiceRequestSchema.parse(body)

  // Verify ownership or organization membership
  const isOwner = await verifyRequestOwnership(session.data.user.id, id)

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
