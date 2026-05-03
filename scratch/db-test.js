const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- TESTE DE INTEGRIDADE ---');
  try {
    const obra = await prisma.obra.findUnique({
      where: { id: 'cmaq57w7r0004vqsg1hcbqph9' }
    });
    console.log('Obra encontrada:', !!obra);
    
    const countAtiv = await prisma.atividade.count({ where: { obraId: 'cmaq57w7r0004vqsg1hcbqph9' } });
    console.log('Atividades:', countAtiv);

    const countVersoes = await prisma.cronogramaVersao.count({ where: { obraId: 'cmaq57w7r0004vqsg1hcbqph9' } });
    console.log('Versões:', countVersoes);

  } catch (e) {
    console.error('ERRO NO BANCO:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
