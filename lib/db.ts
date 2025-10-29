import { PrismaClient } from '~~/prisma/generated/client'

// Declare prisma globally to avoid multiple instances in development
declare global {
  var prisma: PrismaClient | undefined
}

// Instantiate PrismaClient, reusing the global instance in development
export const prisma = globalThis.prisma || new PrismaClient({
  log: [
    {
      emit: 'stdout',
      level: 'error',
    },
  ],
})

// If in development, assign the instance to the global variable
if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
