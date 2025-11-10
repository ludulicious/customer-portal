import { authClient } from '~/utils/auth-client'
import { updateServiceRequestSchema } from '../../utils/service-request-validation'
import { verifyRequestOwnership } from '../../utils/service-request-helpers'
import { db } from '~~/server/utils/db'
import { eq } from 'drizzle-orm'
import { serviceRequest } from '~~/server/db/schema/service-requests'

export default defineEventHandler(async (event) => {
  const session = await authClient.getSession()
  if (!session?.data?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const data = updateServiceRequestSchema.parse(body)

  // Verify ownership or organization membership
  const isOwner = await verifyRequestOwnership(session.data.user.id!, id!)

  if (!isOwner) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  // Users can only update certain fields
  const allowedUpdates: Record<string, string> = {}
  if (data.title) allowedUpdates.title = data.title
  if (data.description) allowedUpdates.description = data.description
  if (data.priority) allowedUpdates.priority = data.priority
  if (data.category) allowedUpdates.category = data.category

  const [request] = await db
    .update(serviceRequest)
    .set(allowedUpdates)
    .where(eq(serviceRequest.id, id!))
    .returning()

  return request
})
