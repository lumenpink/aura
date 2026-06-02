Manifesto de Arquitetura: Projeto Aura
1. Pilares de Segurança
Validação Defensiva: Validação dupla usando Zod em ambos os lados (Frontend e Backend).
Isolamento de Auth: Subdomínio dedicado (auth.aura.com.br) para gerenciamento de cookies.
Token Strategy: Access Token (JWT curto: 15min) + Refresh Token (7 dias, rotação obrigatória, HttpOnly, SameSite=Strict).

2. Estrutura de Monorepo (Workspaces)
packages/shared: Contém todos os esquemas de validação Zod (cpf.schema.ts, auth.schema.ts, etc).
apps/backend: Servidor Hono rodando no Workers, consumindo os schemas compartilhados.
apps/frontend: Aplicação React usando Vite, TanStack Router e Shadcn/UI.

3. UX de Excelência
Code Splitting: Roteamento baseado em lazy load para baixar módulos apenas quando necessário.
Prefetching Estratégico: Uso de preload: 'always' para módulos vitais (Agenda/Pacientes) e preload: 'intent' para módulos contextuais (PEP/Financeiro).
Inputs Bancários: Componentes de formulário utilizando react-hook-form com máscaras controladas (via Controller), garantindo estabilidade do cursor e integridade dos dados limpos.

4. Regras de código
Todas as funções e variáveis devem ter seus nomes em inglês.