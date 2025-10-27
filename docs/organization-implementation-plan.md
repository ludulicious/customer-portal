# Organizations Implementation Plan (Main Layer)

## Overview

Implement organization structure in the main application layer using better-auth's organization plugin. Each user will automatically get their own organization on signup, with the organization concept hidden from the UI initially to allow for future multi-user organization features.

## Phase 1: Install and Configure Better-Auth Organization Plugin

### 1.1 Update Dependencies

Check if better-auth organization plugin is available in current version:
- Review better-auth documentation for organization plugin
- Update better-auth package if needed

### 1.2 Configure Organization Plugin in Auth

Update `lib/auth.ts`:
```typescript
import { organization } from 'better-auth/plugins'

plugins: [
  organization({
    roles: ['owner', 'member'],
    allowUserToCreateOrganization: true,
    sendInvitationEmail: async ({ email, organization, invitedBy }) => {
      // Email sending logic (future feature)
    }
  }),
  // ... other plugins
]
```

## Phase 2: Extend Prisma Schema

### 2.1 Add Organization Models

Update `prisma/schema.prisma`:

```prisma
model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  metadata  Json?    // For future custom fields
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  members OrganizationMember[]
  
  @@map("organizations")
}

model OrganizationMember {
  id             String   @id @default(cuid())
  organizationId String
  userId         String
  role           String   // 'owner', 'member'
  invitedBy      String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([organizationId, userId])
  @@index([userId])
  @@index([organizationId])
  @@map("organization_members")
}
```

### 2.2 Update User Model

Add organization reference to User model:
```prisma
model User {
  // ... existing fields
  
  activeOrganizationId String?
  organizationMembers  OrganizationMember[]
  
  // ... existing relations
}
```

### 2.3 Generate Prisma Client

Run migrations:
```bash
npx prisma migrate dev --name add_organizations
npx prisma generate
```

## Phase 3: Implement Auto-Creation Logic

### 3.1 Update Database Hooks

Modify `lib/auth.ts` database hooks:
```typescript
databaseHooks: {
  user: {
    create: {
      after: async (user: any) => {
        // Existing admin role assignment
        if (user.email && adminEmails.includes(user.email.toLowerCase())) {
          await prisma.user.update({
            where: { id: user.id },
            data: { role: 'admin' }
          })
        }
        
        // Create organization for new user
        const orgName = user.name || user.email.split('@')[0]
        const orgSlug = `${orgName.toLowerCase().replace(/\s+/g, '-')}-${user.id.slice(0, 8)}`
        
        const organization = await prisma.organization.create({
          data: {
            name: `${orgName}'s Organization`,
            slug: orgSlug,
            members: {
              create: {
                userId: user.id,
                role: 'owner'
              }
            }
          }
        })
        
        // Set as active organization
        await prisma.user.update({
          where: { id: user.id },
          data: { activeOrganizationId: organization.id }
        })
      }
    }
  }
}
```

## Phase 4: Update User Store and Session

### 4.1 Extend User Store

Update `app/stores/user.ts`:
```typescript
interface UserStore {
  // ... existing fields
  currentOrganization: Organization | null
  organizations: Organization[]
}

// Add computed/methods
const currentOrganization = ref<Organization | null>(null)
const organizations = ref<Organization[]>([])

async function fetchUserOrganizations() {
  if (!currentUser.value) return
  
  const data = await $fetch('/api/organizations/me')
  organizations.value = data.organizations
  currentOrganization.value = data.activeOrganization
}

function setActiveOrganization(orgId: string) {
  // Switch active organization (for future multi-org support)
  currentOrganization.value = organizations.value.find(o => o.id === orgId) || null
}
```

### 4.2 Create Organization Composable

Create `app/composables/useCurrentOrganization.ts`:
```typescript
export const useCurrentOrganization = () => {
  const userStore = useUserStore()
  
  const currentOrganization = computed(() => userStore.currentOrganization)
  const organizationId = computed(() => userStore.currentOrganization?.id)
  
  return {
    currentOrganization,
    organizationId,
    isOrganizationOwner: computed(() => {
      // Check if user is owner of current org
    })
  }
}
```

### 4.3 Update Custom Session

Extend `lib/auth.ts` customSession plugin:
```typescript
customSession(async (sessionData) => {
  const { user, session } = sessionData
  
  const account = await prisma.account.findFirst({
    where: { userId: user.id },
  })
  
  // Fetch active organization
  const organizationMember = await prisma.organizationMember.findFirst({
    where: { 
      userId: user.id,
      organizationId: user.activeOrganizationId || undefined
    },
    include: {
      organization: true
    }
  })
  
  return {
    ...session,
    user: {
      ...user,
      providerId: account?.providerId || null,
      organization: organizationMember?.organization || null
    },
  }
})
```

## Phase 5: Create Organization API Endpoints

### 5.1 User Organizations Endpoint

Create `server/api/organizations/me.get.ts`:
```typescript
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  
  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    include: { organization: true }
  })
  
  const organizations = memberships.map(m => m.organization)
  const activeOrganization = organizations.find(
    o => o.id === session.user.activeOrganizationId
  ) || organizations[0]
  
  return {
    organizations,
    activeOrganization
  }
})
```

### 5.2 Switch Organization Endpoint (Future)

Create `server/api/organizations/switch.post.ts`:
```typescript
// For future multi-organization support
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const { organizationId } = await readBody(event)
  
  // Verify user is member of organization
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: session.user.id
      }
    }
  })
  
  if (!membership) {
    throw createError({ statusCode: 403, message: 'Not a member' })
  }
  
  await prisma.user.update({
    where: { id: session.user.id },
    data: { activeOrganizationId: organizationId }
  })
  
  return { success: true }
})
```

## Phase 6: Update Permission System

### 6.1 Add Organization Permissions

Update `lib/auth/permissions.ts`:
```typescript
export const statement = {
  ...defaultStatements,
  organization: [
    'create',
    'read',
    'update',
    'delete',
    'invite-member',
    'remove-member',
    'list-members'
  ],
  // ... existing statements
} as const
```

### 6.2 Update Role Permissions

```typescript
export const user = ac.newRole({
  organization: ['read'], // Can only read their own org
  // ... existing permissions
})

export const admin = ac.newRole({
  ...adminAc.statements,
  organization: ['create', 'read', 'update', 'delete', 'invite-member', 'remove-member', 'list-members'],
  // ... existing permissions
})
```

## Phase 7: Create Helper Utilities

### 7.1 Organization Utilities

Create `lib/organization-utils.ts`:
```typescript
export async function getUserOrganization(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      organizationMembers: {
        where: {
          organizationId: { not: null }
        },
        include: { organization: true }
      }
    }
  })
  
  return user?.organizationMembers[0]?.organization || null
}

export async function isOrganizationMember(userId: string, organizationId: string) {
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId
      }
    }
  })
  
  return !!membership
}

export async function isOrganizationOwner(userId: string, organizationId: string) {
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId
      }
    }
  })
  
  return membership?.role === 'owner'
}
```

## Phase 8: Data Migration for Existing Users

### 8.1 Create Migration Script

Create `scripts/migrate-users-to-organizations.ts`:
```typescript
// Script to create organizations for existing users
async function migrateExistingUsers() {
  const usersWithoutOrg = await prisma.user.findMany({
    where: {
      activeOrganizationId: null
    }
  })
  
  for (const user of usersWithoutOrg) {
    const orgName = user.name || user.email.split('@')[0]
    const orgSlug = `${orgName.toLowerCase().replace(/\s+/g, '-')}-${user.id.slice(0, 8)}`
    
    const organization = await prisma.organization.create({
      data: {
        name: `${orgName}'s Organization`,
        slug: orgSlug,
        members: {
          create: {
            userId: user.id,
            role: 'owner'
          }
        }
      }
    })
    
    await prisma.user.update({
      where: { id: user.id },
      data: { activeOrganizationId: organization.id }
    })
    
    console.log(`Created organization for user ${user.email}`)
  }
}
```

### 8.2 Add Migration to package.json

```json
"scripts": {
  "migrate:organizations": "tsx scripts/migrate-users-to-organizations.ts"
}
```

## Phase 9: Update Auth Plugin (Client)

### 9.1 Update Auth Client

Update `lib/auth-client.ts` if organization plugin requires client-side setup:
```typescript
import { organizationClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: baseURL,
  plugins: [
    adminClient({ ... }),
    emailOTPClient(),
    organizationClient() // Add if available
  ],
})
```

## Technical Considerations

### Hidden Organization Pattern
- Organization concept is abstracted in composables
- UI never mentions "organization" initially
- Helper functions make it seamless for developers
- Easy to expose organization UI when needed

### Performance
- Index on userId and organizationId in OrganizationMember
- Cache organization membership checks
- Lazy load organizations list

### Security
- All future features should check organization membership
- Row-level security via organizationId
- Owner role for organization management

### Backward Compatibility
- Migration script handles existing users
- Nullable activeOrganizationId during transition
- Graceful fallback if organization not found

## Files to Create/Modify

**Modified:**
- `lib/auth.ts` - Add organization plugin and hooks
- `prisma/schema.prisma` - Add organization models
- `lib/auth/permissions.ts` - Add organization permissions
- `app/stores/user.ts` - Add organization state
- `lib/auth-client.ts` - Add organization client plugin

**Created:**
- `app/composables/useCurrentOrganization.ts` - Organization helper
- `lib/organization-utils.ts` - Server-side utilities
- `server/api/organizations/me.get.ts` - Get user organizations
- `server/api/organizations/switch.post.ts` - Switch active org
- `scripts/migrate-users-to-organizations.ts` - Migration script

## Testing

1. Test auto-creation on new user signup
2. Verify organization is assigned correctly
3. Test organization fetch in session
4. Verify composable returns correct org
5. Test migration script with existing users
6. Verify permissions are enforced

## Future Enhancements (Out of Scope)

- Organization settings page
- Invite team members UI
- Organization switching UI
- Organization billing/subscription
- Custom organization domains

## To-dos

- [ ] Research better-auth organization plugin documentation and API
- [ ] Update better-auth package if needed for organization support
- [ ] Configure organization plugin in lib/auth.ts
- [ ] Add Organization and OrganizationMember models to Prisma schema
- [ ] Update User model with activeOrganizationId reference
- [ ] Run Prisma migration and generate client
- [ ] Implement auto-creation of organization in user create hook
- [ ] Extend user store with organization state and methods
- [ ] Create useCurrentOrganization composable
- [ ] Update customSession to include organization data
- [ ] Create /api/organizations/me.get.ts endpoint
- [ ] Create /api/organizations/switch.post.ts endpoint
- [ ] Add organization permissions to permission system
- [ ] Create organization utility functions in lib/organization-utils.ts
- [ ] Create migration script for existing users
- [ ] Update auth client with organization plugin if needed
- [ ] Test organization creation and assignment flows
