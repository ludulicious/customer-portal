/**
 * API request/response types for all API endpoints
 */
import type { Organization, User, Invitation } from './database'
import type { UserRole } from './auth'

/**
 * GET /api/admin/organizations
 * Response: Array of organizations
 */
export type AdminOrganizationsResponse = Organization[]

/**
 * GET /api/admin/users
 * Response: Array of users with selected fields
 */
export type AdminUserResponse = User

export type AdminUsersResponse = AdminUserResponse[]

/**
 * PATCH /api/admin/users/[id]/role
 * Request body for updating user role
 */
export interface UpdateUserRoleRequest {
  role: UserRole
}

/**
 * PATCH /api/admin/users/[id]/role
 * Response after updating user role
 */
export interface UpdateUserRoleResponse {
  success: boolean
  message: string
}

/**
 * GET /api/organizations/[id]/invitations
 * Response: Array of invitations for an organization
 */
export type OrganizationInvitationsResponse = Invitation[]
