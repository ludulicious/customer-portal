import { authClient } from '~~/lib/auth-client'
import { createServiceRequestSchema } from '../../utils/service-request-validation'
import { db } from '~~/lib/db'
import { serviceRequest } from '~~/db/schema/service-requests'
import { defineEventHandler, createError, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const session = await authClient.getSession()
  if (!session?.data?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const data = createServiceRequestSchema.parse(body)

  // Get user's organization using better-auth
  const { data: member } = await authClient.organization.getActiveMember()
  const organizationId = member?.organizationId

  if (!organizationId) {
    throw createError({ statusCode: 400, message: 'No organization found' })
  }

  const [request] = await db
    .insert(serviceRequest)
    .values({
      ...data,
      organizationId,
      createdById: session.data.user.id,
      status: 'OPEN',
      priority: (data as any).priority || 'MEDIUM',
    })
    .returning()

  return request
})
