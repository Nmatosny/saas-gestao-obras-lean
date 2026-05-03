import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  const isDev = process.env.NODE_ENV !== 'production';
  
  return new PrismaClient({
    log: isDev ? ['error', 'warn'] : ['error'],
  });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
