/**
 * Prisma Client Singleton (Prisma v7 compatible)
 * 
 * Prisma v7 passes database connection via the PrismaClient constructor
 * (not the schema.prisma file). This singleton prevents connection pool
 * exhaustion during Next.js hot-module reloading in development.
 * 
 * @module
 */
import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
