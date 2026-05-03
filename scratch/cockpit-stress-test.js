const { PrismaClient } = require('@prisma/client');
const { MetricsEngine } = require('../lib/metrics');
const { gerarAlertas } = require('../lib/alertService');
const { ReprogramacaoService } = require('../lib/services/ReprogramacaoService');

const prisma = new PrismaClient();
const obraId = 'cmoq57w7r0004vqsg1hebeph9';

async function testCockpit() {
  console.log('--- INICIANDO SIMULAÇÃO COCKPIT ---');
  try {
    const obra = await prisma.obra.findUnique({ where: { id: obraId } });
    console.log('1. Obra:', !!obra);

    const atividades = await prisma.atividade.findMany({
      where: { obraId },
      include: { service: true, location: true, restricoes: true }
    });
    console.log('2. Atividades carregadas:', atividades.length);

    const diarios = await prisma.diario.findMany({
      where: { obraId },
      include: { atividades: true }
    });
    console.log('3. Diários carregados:', diarios.length);

    const versoes = await prisma.cronogramaVersao.findMany({ where: { obraId } });
    console.log('4. Versões carregadas:', versoes.length);

    const dependencias = await prisma.dependency.findMany({ where: { obraId } });
    console.log('5. Dependências carregadas:', dependencias.length);

    console.log('6. Testando Alertas...');
    const alerts = gerarAlertas(atividades, diarios);
    console.log('   Alertas gerados:', alerts.length);

    console.log('7. Testando Reprogramação...');
    const projecao = ReprogramacaoService.simularImpactoAtraso(atividades, dependencias);
    console.log('   Projeção concluída:', !!projecao);

    console.log('--- SUCESSO TOTAL ---');
  } catch (err) {
    console.error('--- FALHA DETECTADA ---');
    console.error('Mensagem:', err.message);
    console.error('Stack:', err.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testCockpit();
