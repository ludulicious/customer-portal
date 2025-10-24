import { createAccessControl } from 'better-auth/plugins/access'
import { defaultStatements, adminAc } from 'better-auth/plugins/admin/access'

// Define our custom statements for questionnaires and responses
export const statement = {
  ...defaultStatements,
  questionnaire: [
    'create',
    'read',
    'update',
    'delete',
    'list',
    'share',
    'view-responses'
  ],
  'questionnaire-response': [
    'create',
    'read',
    'update',
    'delete',
    'list',
    'generate-sample-responses'
  ]
} as const

// Create the access control instance
const ac = createAccessControl(statement)

// Define our roles with their permissions
export const user = ac.newRole({
  questionnaire: ['create', 'read', 'update', 'delete', 'list', 'share',],
  'questionnaire-response': ['create', 'read', 'list']
})

export const admin = ac.newRole({
  ...adminAc.statements,
  questionnaire: ['create', 'read', 'update', 'delete', 'list', 'share',],
  'questionnaire-response': ['create', 'read', 'update', 'delete', 'list', 'generate-sample-responses']
})

// Export the access control instance and roles
export { ac }

