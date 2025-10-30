import { authClient } from '~~/lib/auth-client'
import { verifyOrganizationAccess } from '../../utils/service-request-helpers'
import { db } from '~~/lib/db'
import { eq } from 'drizzle-orm'
import { serviceRequest } from '~~/db/schema/service-requests'

export default defineEventHandler(async (event) => {
  const session = await authClient.getSession()
  if (!session?.data?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')

  const [request] = await db
    .select()
    .from(serviceRequest)
    .where(eq(serviceRequest.id, id!))
    .limit(1)

  if (!request) {
    throw createError({ statusCode: 404, message: 'Request not found' })
  }

  // Verify user has access to this organization's requests
  const hasAccess = await verifyOrganizationAccess(
    session.data.user.id,
    request.organizationId
  )

  if (!hasAccess) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  // Hide internal notes from non-admin users
  const { data: role } = await authClient.organization.getActiveMemberRole()
  const isAdmin = role?.role === 'owner' || role?.role === 'admin'

  if (!isAdmin) {
    delete request.internalNotes
  }

  return request
})
