import { PrismaClient } from '@prisma/client';
import { loadEnvironment } from './config/env-loader';

// Carregar variáveis de ambiente na ordem correta
loadEnvironment();

// --- Main App Prisma Client (Singleton) ---
const globalForPrismaApp = globalThis as unknown as {
  prismaApp: PrismaClient | undefined
}

export const prismaApp = globalForPrismaApp.prismaApp ?? new PrismaClient({
  log: ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

if (process.env.NODE_ENV !== 'development') globalForPrismaApp.prismaApp = prismaApp;


// --- Blog Prisma Client (Singleton) ---
const globalForPrismaBlog = globalThis as unknown as {
  prismaBlog: PrismaClient | undefined
}

export const prismaBlog = globalForPrismaBlog.prismaBlog ?? new PrismaClient({
  log: ['error'],
  datasources: {
    db: {
      url: process.env.BLOG_DATABASE_URL
    }
  }
});

if (process.env.NODE_ENV !== 'development') globalForPrismaBlog.prismaBlog = prismaBlog;