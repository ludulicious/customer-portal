import { defineEventHandler, createError } from 'h3'
import { statement, user as userRole, admin as adminRole } from '~~/shared/permissions'
import { auth } from '~~/server/utils/auth'
import { db } from '~~/server/utils/db'
import { member as memberTable, organization as organizationTable } from '~~/server/db/schema/auth-schema'
import { eq, and } from 'drizzle-orm'
import type { MemberRole, Organization } from '#types'

// Type for role statements structure
type RoleStatements = Record<string, readonly string[]>

// Helper to extract statements from a role object
const getRoleStatements = (role: unknown): RoleStatements => {
  // Roles created with ac.newRole() may have a statements property or be the statements object itself
  if (role && typeof role === 'object' && 'statements' in role) {
    return (role as { statements: RoleStatements }).statements
  }
  return role as RoleStatements
}

// Define organization role permissions mapping
// Organization owners get full permissions including organization management
// Organization admins get most permissions except organization deletion
// Members get basic service-request permissions (same as user role)
const getOrganizationRolePermissions = (orgRole: MemberRole | null | undefined): RoleStatements => {
  if (!orgRole) {
    // No organization role, return user role permissions
    return getRoleStatements(userRole)
  }

  // Get base user role permissions
  const userStatements = getRoleStatements(userRole)
  const permissions: RoleStatements = { ...userStatements }

  // All organization roles get full service-request permissions
  permissions['service-request'] = ['create', 'read', 'update', 'delete', 'list']

  if (orgRole === 'owner') {
    // Owners get full organization management permissions
    permissions['organization'] = ['read', 'update', 'delete']
    permissions['member'] = ['read', 'list', 'create', 'update', 'delete', 'update-name']
    permissions['invitation'] = ['create', 'cancel']
    permissions['service-request'] = ['create', 'read', 'update', 'delete', 'list']
  } else if (orgRole === 'admin') {
    // Admins can manage members and invitations but not delete organization
    permissions['organization'] = ['read', 'update'] // No 'delete' for admins
    permissions['member'] = ['read', 'list', 'create', 'update', 'delete', 'update-name']
    permissions['invitation'] = ['create', 'cancel']
    permissions['service-request'] = ['create', 'read', 'update', 'delete', 'list']
  } else if (orgRole === 'member') {
    // Members can read organization and list/read members but not manage them
    permissions['organization'] = ['read']
    permissions['member'] = ['read', 'list']
    permissions['service-request'] = ['create', 'read', 'update', 'list']
  }
  // If no org role, only service-request permissions (already set above)

  return permissions
}

export default defineEventHandler(async (event) => {
  // Get authenticated user
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  type SessionUserWithRole = { role?: string }
  const currentUser = session.user as SessionUserWithRole
  // Get user's role from the database
  const currentRole = currentUser.role || 'user'

  let roleDefinition: unknown = currentRole === 'admin' ? adminRole : userRole
  let orgRole: MemberRole | null = null
  let activeOrganization: Organization | null = null

  // Check organization role for both "user" and "admin" roles if activeOrganizationId exists
  // auth.api.getSession() returns { user, session } where session has activeOrganizationId
  type SessionWithOrg = { session?: { activeOrganizationId?: string }, activeOrganizationId?: string }
  const sessionWithOrg = session as SessionWithOrg
  const activeOrganizationId = sessionWithOrg?.session?.activeOrganizationId || sessionWithOrg?.activeOrganizationId

  if (activeOrganizationId) {
    try {
      // Get the user's role in the active organization
      const [member] = await db
        .select({ role: memberTable.role })
        .from(memberTable)
        .where(
          and(
            eq(memberTable.userId, session.user.id),
            eq(memberTable.organizationId, activeOrganizationId)
          )
        )
        .limit(1)

      if (member) {
        orgRole = member.role as MemberRole
        // For "user" role, use organization role permissions instead of user role
        if (currentRole === 'user') {
          const orgPermissions = getOrganizationRolePermissions(orgRole)
          // Create a temporary role-like object for permission checking
          roleDefinition = orgPermissions
        }
        // For "admin" role, they get all organization permissions regardless of their org role
        // The admin role already has admin permissions, we just need to add org permissions
      } else if (currentRole === 'admin') {
        // Admin users get all organization permissions even if not a member
        // This allows admins to manage any organization
      }

      // Get organization details
      const [organization] = await db
        .select()
        .from(organizationTable)
        .where(eq(organizationTable.id, activeOrganizationId))
        .limit(1)

      if (organization) {
        activeOrganization = organization as Organization
      }
    } catch (error) {
      console.error('Error fetching organization role or details:', error)
      // Fall back to default role if there's an error
    }
  }

  // For system admins with an active organization, grant all organization permissions
  if (currentRole === 'admin' && activeOrganizationId) {
    const adminStatements = getRoleStatements(adminRole)
    const adminPermissions: RoleStatements = { ...adminStatements }
    // Add all organization-related permissions for admins
    adminPermissions['organization'] = ['read', 'update', 'delete']
    adminPermissions['member'] = ['read', 'list', 'create', 'update', 'delete', 'update-name']
    adminPermissions['invitation'] = ['create', 'cancel']
    roleDefinition = adminPermissions
  }

  // Get all permissions for the user
  const permissions: Record<string, boolean> = {}

  // Get role statements - roles created with ac.newRole() have a statements property
  // or the role object itself might be the statements object
  const roleStatements = getRoleStatements(roleDefinition)

  // Check each subject and permission combination
  for (const [subject, actions] of Object.entries(statement)) {
    if (Array.isArray(actions)) {
      // Get permissions for this subject from the role
      const rolePermissions = roleStatements[subject] || []

      for (const action of actions) {
        // Check if the role has this permission
        permissions[`${subject}.${action}`] = Array.isArray(rolePermissions) && rolePermissions.includes(action)
      }
    }
  }

  return {
    permissions,
    role: currentRole,
    organizationRole: orgRole || null,
    activeOrganization: activeOrganization
  }
})
