import { authClient } from '~/utils/auth-client'
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

  // Verify ownership
  const isOwner = await verifyRequestOwnership(session.data.user.id!, id!)

  if (!isOwner) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  await db.delete(serviceRequest).where(eq(serviceRequest.id, id!))

  return { success: true }
})
