import { defineEventHandler, createError, getRouterParam } from 'h3'
import { eq } from 'drizzle-orm'
import { auth } from '~~/server/utils/auth'
import { db } from '~~/server/utils/db'
import { organization as organizationTable } from '~~/server/db/schema/auth-schema'
import type { SessionUser, Organization } from '~~/shared/types'

export default defineEventHandler(async (event): Promise<Organization> => {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Check if user is admin
  const user = session.user as SessionUser
  if (user.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, message: 'Slug is required' })
  }
  // Get organization by slug
  const organization = await db
    .select()
    .from(organizationTable)
    .where(eq(organizationTable.slug, slug))
    .orderBy(organizationTable.createdAt)

  if (!organization || organization.length == 0) {
    throw createError({ statusCode: 404, message: 'Organization not found' })
  }

  return organization[0] as Organization
})
