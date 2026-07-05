import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Resolve the connection string.
// On Render/Railway: DATABASE_URL is a standard postgresql:// URL (set in env vars dashboard).
// On local dev: DATABASE_URL may be a prisma+postgres:// URL — decode it.
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

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
