import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Extract direct TCP connection string from prisma+postgres:// URL if present
let connectionString = process.env.DATABASE_URL || '';

if (connectionString.startsWith('prisma+postgres://')) {
  try {
    const urlObj = new URL(connectionString);
    const apiKey = urlObj.searchParams.get('api_key');
    if (apiKey) {
      const decoded = Buffer.from(apiKey, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);
      if (parsed.databaseUrl) {
        connectionString = parsed.databaseUrl;
      }
    }
  } catch (e) {
    console.error("Failed to parse database connection string from api_key:", e);
  }
}

const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)

// Override DATABASE_URL so Prisma Client reads standard TCP postgresql:// at runtime
process.env.DATABASE_URL = connectionString

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
