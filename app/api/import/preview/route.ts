import { NextResponse } from 'next/server';
import * as xlsx from 'xlsx';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const filename = file.name.toLowerCase();
    
    // Tratamento educativo para MPP
    if (filename.endsWith('.mpp')) {
      return NextResponse.json({ error: 'Para garantirmos a precisão do mapeamento, por favor exporte seu cronograma do MS Project como XML (Salvar Como -> Dados XML).' }, { status: 400 });
    }

    if (!filename.endsWith('.xlsx') && !filename.endsWith('.xls') && !filename.endsWith('.csv') && !filename.endsWith('.xml')) {
      return NextResponse.json({ error: 'Formato não suportado. Envie .xlsx, .csv ou .xml' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let headers: string[] = [];

    if (filename.endsWith('.xml')) {
      // Para XML do Project, a nossa engine atual já processa a estrutura de pastas automaticamente.
      // Poderíamos retornar os "Campos Personalizados" para mapeamento, mas o MS Project XML tem estrutura rígida.
      // Vamos retornar um aviso para a tela que o XML é automático.
      return NextResponse.json({ isXml: true, message: 'Arquivo MS Project detectado. O sistema extrairá automaticamente as pastas como Locais e as tarefas como Serviços.' });
    } else {
      // Processamento Excel/CSV
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      // Converte as primeiras linhas para pegar o cabeçalho
      const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      
      if (rows.length === 0) {
         return NextResponse.json({ error: 'A planilha está vazia.' }, { status: 400 });
      }

      // Extrai as chaves do primeiro objeto (que correspondem aos cabeçalhos da planilha)
      headers = Object.keys(rows[0]);
      
      return NextResponse.json({ isXml: false, headers });
    }

  } catch (error) {
    console.error('Erro no preview:', error);
    return NextResponse.json({ error: 'Erro ao tentar ler o arquivo. Verifique se ele não está corrompido.' }, { status: 500 });
  }
}
