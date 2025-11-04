import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Carregar variáveis de ambiente se ainda não foram carregadas
if (!process.env.DATABASE_URL) {
  dotenv.config();
}

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