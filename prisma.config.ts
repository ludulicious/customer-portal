import type { PrismaConfig } from 'prisma'
import 'dotenv/config' // this will load the environment variables, so the DATABASE_URL is available in the schema files

export default {
  schema: 'prisma/schema'
} satisfies PrismaConfig
