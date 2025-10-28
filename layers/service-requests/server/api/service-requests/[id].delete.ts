import { authClient } from '~~/lib/auth-client'
import { verifyRequestOwnership } from '../../utils/service-request-helpers'
import { prisma } from '~~/lib/db'

export default defineEventHandler(async (event) => {
  const session = await authClient.getSession()
  if (!session?.data?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')

  // Verify ownership
  const isOwner = await verifyRequestOwnership(session.data.user.id, id)

  if (!isOwner) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  await prisma.serviceRequest.delete({
    where: { id }
  })

  return { success: true }
})
