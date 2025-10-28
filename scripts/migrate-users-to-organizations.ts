import { auth } from '../lib/auth'
import { prisma } from '../lib/db'

// Script to create organizations for existing users using better-auth API
async function migrateExistingUsers() {
  console.log('Starting migration of existing users to organizations...')

  const usersWithoutOrg = await prisma.user.findMany({
    where: {
      // Find users who don't have an active organization
      // We'll check this by looking for users who aren't members of any organization
      NOT: {
        members: {
          some: {}
        }
      }
    }
  })

  console.log(`Found ${usersWithoutOrg.length} users without organizations`)

  for (const user of usersWithoutOrg) {
    const orgName = user.name || user.email.split('@')[0]
    const orgSlug = `${orgName.toLowerCase().replace(/\s+/g, '-')}-${user.id.slice(0, 8)}`

    try {
      // Use better-auth API to create organization
      await auth.api.createOrganization({
        body: {
          name: `${orgName}'s Organization`,
          slug: orgSlug,
          userId: user.id,
          keepCurrentActiveOrganization: false
        }
      })

      console.log(`✅ Created organization for user ${user.email}`)
    } catch (error) {
      console.error(`❌ Failed to create organization for user ${user.email}:`, error)
    }
  }

  console.log('Migration completed!')
}

// Run the migration
migrateExistingUsers()
  .then(() => {
    console.log('Migration script finished')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration script failed:', error)
    process.exit(1)
  })


