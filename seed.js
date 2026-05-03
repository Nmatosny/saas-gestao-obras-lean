const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.workspace.upsert({
    where: { id: 'workspace-1' },
    update: {},
    create: {
      id: 'workspace-1',
      name: 'Minha Empresa Mockada',
    },
  });
  console.log('Workspace criado!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
