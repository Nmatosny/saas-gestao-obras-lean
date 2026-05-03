# ANTIGRAVITY | SaaS de Gestão de Obras Inteligente

![Dashboard Preview](https://github.com/Nmatosny/saas-gestao-obras-lean/raw/main/preview.png)

## 🏗️ Sobre o Projeto
O **ANTIGRAVITY** é um SaaS de gestão de obras de alto desempenho, focado na metodologia **Lean Construction** (Construção Enxuta). O sistema foi desenvolvido para transformar o canteiro de obras em uma linha de produção eficiente, permitindo monitoramento em tempo real de avanço físico, financeiro e confiabilidade de planejamento.

Este projeto foi otimizado para seguir o padrão estético e técnico de plataformas líderes de mercado, como a **Prevision**.

---

## 🚀 Funcionalidades Principais (Nível Engenharia Sênior)

### 📊 Inteligência Lean & Planejamento
- **Lookahead Planning (Médio Prazo)**: Gestão proativa de restrições para os próximos 30 dias. Identifique impedimentos (materiais, projetos, equipes) antes que eles parem a obra.
- **PPC Automático (Percent Plan Complete)**: Cálculo semanal de confiabilidade comparando o planejado no Kanban vs. realizado no campo.
- **Linha de Balanço (LOB)**: Visualização de fluxos de trabalho rítmicos com detecção de impactos e projeção de atrasos baseada em dependências.

### 🎮 Controle de Produção
- **Kanban de Postos**: Gestão visual de atividades semanais por local.
- **RDO Inteligente**: Diário de Obra com sugestão automática de tarefas do dia e galeria de evidências fotográficas.
- **Análise de Causa (CNC)**: Registro e análise de Pareto das Causas de Não Cumprimento para melhoria contínua.

### 📈 Controladoria & Dashboard Executivo
- **Análise de Valor Agregado (EVA)**: KPIs de desempenho financeiro (SPI, CPI, EAC, VAC).
- **Forecast Hero**: Algoritmo de projeção de término real baseado na velocidade atual da equipe (Run Rate).
- **Visão de Portfólio**: Dashboard consolidado para análise de múltiplas obras simultaneamente.

---

## 🛠️ Tech Stack
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS (Clean White UI Design)
- **Banco de Dados**: PostgreSQL com [Prisma ORM](https://www.prisma.io/)
- **Gráficos**: Recharts
- **Ícones**: Lucide React

---

## 🏁 Como Rodar o Projeto

1. **Clone o repositório**:
   ```bash
   git clone https://github.com/Nmatosny/saas-gestao-obras-lean.git
   ```

2. **Instale as dependências**:
   ```bash
   npm install
   ```

3. **Configure o Banco de Dados**:
   Crie um arquivo `.env` com sua `DATABASE_URL` e execute:
   ```bash
   npx prisma db push
   ```

4. **Inicie o servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```

---

## 📐 Metodologia Aplicada
O sistema não é apenas um gestor de tarefas, mas uma ferramenta que implementa o **Last Planner System**, focando em:
1. **Poder**: Planejar o que deve ser feito.
2. **Poder**: Remover restrições para que o trabalho possa ser feito.
3. **Fazer**: Executar e medir o que foi feito.

---
Desenvolvido por **Antigravity AI** em parceria com **Nmatosny**.