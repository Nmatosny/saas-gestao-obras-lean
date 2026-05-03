import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  console.log('Iniciando instância do Prisma...');
  try {
    return new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  } catch (e: any) {
    console.error('FALHA CRÍTICA AO INICIAR PRISMA:', e.message);
    throw e;
  }
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
