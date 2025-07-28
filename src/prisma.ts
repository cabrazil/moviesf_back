import { PrismaClient } from '@prisma/client';

// Singleton pattern para serverless
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  // Configurações para serverless
  __internal: {
    engine: {
      enableEngineDebugMode: false
    }
  }
});

// Manter instância em produção também
if (process.env.NODE_ENV !== 'development') globalForPrisma.prisma = prisma;

export default prisma; 