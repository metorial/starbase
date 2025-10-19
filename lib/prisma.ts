import { PrismaClient } from '@prisma/client';

let globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export let prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
