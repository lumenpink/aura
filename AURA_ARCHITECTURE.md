Manifesto de Arquitetura: Projeto Aura
1. Pilares de Segurança
Validação Defensiva: Validação dupla usando Zod em ambos os lados (Frontend e Backend).
Isolamento de Auth: Subdomínio dedicado (auth.aura.com.br) para gerenciamento de cookies.
Token Strategy: Access Token (JWT curto: 15min) + Refresh Token (7 dias, rotação obrigatória, HttpOnly, SameSite=Strict).

2. Estrutura de Monorepo (Workspaces)
packages/shared: Contém todos os esquemas de validação Zod (cpf.schema.ts, auth.schema.ts, etc).
apps/backend: Servidor Hono rodando no Workers, consumindo os schemas compartilhados.
apps/frontend: Aplicação React usando Vite, TanStack Router e Shadcn/UI.
apps/internal-docs: Aplicação isolada e de acesso restrito gerada via Starlight (Astro), destinada à documentação de engenharia (DevSpecs, regras de arquitetura, segurança e topologia de rede).
apps/user-manual: Aplicação pública gerada via Starlight (Astro), destinada à central de ajuda e manuais de operação para os usuários da clínica.

3. UX de Excelência
Code Splitting: Roteamento baseado em lazy load para baixar módulos apenas quando necessário.
Prefetching Estratégico: Uso de preload: 'always' para módulos vitais (Agenda/Pacientes) e preload: 'intent' para módulos contextuais (PEP/Financeiro).
Inputs Bancários: Componentes de formulário utilizando react-hook-form com máscaras controladas (via Controller), garantindo estabilidade do cursor e integridade dos dados limpos.
App Shell e Login Minimalista: A interface de entrada e o esqueleto de navegação (App Shell) devem banir distrações visuais e ilustrações genéricas. A tela de login deve empregar um Trust Footer (indicadores de segurança, criptografia e conformidade em texto puro e minimalista) e manter uma atmosfera limpa focada no ritual de autenticação.
Iconografia Estrita: Uso exclusivo de ícones de linhas finas da biblioteca lucide-react em todo o sistema para garantir leveza, precisão e padronização visual.

4. Cloud Status
O status do Aura Cloud é um componente visual que indica o estado atual da topologia e da conexão do sistema. No painel principal (App Shell), ele deve ser exibido no cabeçalho da barra lateral esquerda (Sidebar), posicionado de forma discreta ao lado do seletor de tema. Na página de login, ele deve ser exibido no rodapé da página acompanhado do texto descritivo do status atual. O componente deve mapear cinco estados distintos de rede:
Aura Cloud (Online): Conexão plena com a infraestrutura de borda (ícone de nuvem com check discreto).
Aura Sync (Sincronizando): Transmitindo pacotes de dados represados (setas circulares com animação leve).
Aura LAN (Rede Local): Sem acesso à internet, mas operando ativamente conectado ao servidor local ou VPN da clínica (ícone de servidor de rack).
Aura Local (Dispositivo): Isolamento de rede total, operando os dados exclusivamente no armazenamento da própria máquina (ícone de disco rígido ou laptop).
Aura Erro (Falha): Interrupção de serviço não mapeada (triângulo de alerta com contorno fino).
Quando exibido apenas na forma de ícone, o componente deve possuir suporte a tooltip (com visual glassmorphic) ativado por passagem de mouse (hover) e por toque (touch), contendo descarte automático (auto-dismiss) ao clicar em qualquer outra área da tela.

5. A Stack
5.1. Roteador: TanStack Router
5.2. Gestão de Estado
5.2.1. Estado do Servidor (Dados do Banco): TanStack Query (React Query)
5.2.2. Estado do Cliente (Interface Local): Zustand
5.3. Formulários e Validação: React Hook Form + Zod
5.4. Hono RPC Client
5.5. Design System, Identidade e Tipografia
    Frameworks: Shadcn/UI + Tailwind CSS.
    Paleta de Cores: Uso obrigatório da identidade "Aura Platinada", caracterizada por fundos iluminados em zinc-50, contrastes em zinc-850, e destaques baseados no espectro de luz do logotipo: Violeta (#8b5cf6), Rosa de Refração (#ec4899) e Platinado (#e2e8f0).
    Tipografia: Adoção estrita da fonte Geist Sans (com Inter como fallback). É imperativo o uso de pesos leves (font-light) e espaçamentos horizontais expandidos (tracking-wide a tracking-[0.3em]) para logotipos e títulos.
5.6. Documentação Integrada
    Motor: Starlight (Astro).
    Integração: Adoção da Island Architecture (Arquitetura de Ilhas) para permitir a renderização nativa e sem atrito dos componentes React da interface (ex: logotipo dinâmico) diretamente dentro dos arquivos Markdown (.md e .mdx) de documentação.

6. Topologia e Infraestrutura (Backend)
O sistema adota o padrão de Monólito Modular focado em isolamento de clientes (Multi-tenant via Silos), otimizando segurança e performance na borda.
Ambiente de Execução: Cloudflare Workers.
Isolamento (Silos): Cada clínica (cliente) terá o seu próprio Worker e seu próprio banco de dados, garantindo que não haja vazamento de dados entre clientes e simplificando a adequação à LGPD.
Framework Backend: Hono (leve, rápido e com suporte nativo para Edge Computing).
Banco de Dados: Cloudflare D1 (banco relacional baseado em SQLite, com latência zero na borda).
ORM: Drizzle ORM para manter o sistema agnóstico em relação ao banco de dados.

7. Frontend
O frontend será uma Single Page Application (SPA) hospedada no Cloudflare Pages, comunicando-se perfeitamente com os Workers. Foco em tipagem estrita (Type-Safety) e design premium.
Core: React (com Vite).
Estilização e Componentes: Tailwind CSS + Shadcn/UI (Design minimalista, premium e altamente compatível com automação de código via IA).
Roteamento: TanStack Router (Rotas seguras e tipadas).
Comunicação API: Hono RPC Client (Ponte com tipagem ponta a ponta entre front e back).
Estado do Servidor (Dados): TanStack Query (Gerenciamento de cache e requisições).
Estado do Cliente (Local): Zustand (Leve e sem boilerplate).
Formulários e Validação: React Hook Form + Zod.
Identidade Visual via Código (Componente Logo): O logotipo do sistema (Eclipse Solar Geométrico) não deve ser tratado como um ativo de imagem estático. Ele é construído e renderizado via matemática pura em SVG encapsulado em um componente React (apps/frontend/src/components/brand/Logo.tsx). O componente utiliza filtros nativos (feGaussianBlur, linearGradient) para gerar efeitos de refração, garantindo escalabilidade vetorial perfeita e suporte a variantes dinâmicas de cor e tamanho.
Estética de Interface (Luz e Profundidade): O design deve abandonar sombras pesadas e bordas duras. É obrigatório o uso do conceito de Glassmorphism (efeitos de vidro translúcido via backdrop-blur) e a difusão de luz focada (efeito glow utilitário em Tailwind) para interações e elementos em destaque, refletindo a aura de iluminação do próprio logotipo na interface.

8. Regras de código
Todas as funções e variáveis devem ter seus nomes em inglês.
É importante que todas as funções e variáveis (quando não for óbvio) tenham pelo menos uma descrição em inglês do que elas fazem. Além disso, os comentários devem ser em inglês.

9. Diretrizes de design de código
O sistema deve seguir um design minimalista, premium e altamente compatível com automação de código via IA e seguir as premissas de DDD.
Os componentes devem ser reutilizáveis e fáceis de modificar.
Os componentes devem seguir um padrão de design system, com cores, tipografia, espaçamento, etc. (seguindo as diretrizes do shadcn/ui + Tailwind CSS)
O sistema não deve ficar restrito a nenhuma chamada de API da Cloudflare, devendo todo código especificado seguir as premissas de Cloud Agnostic (podendo ser executado em qualquer ambiente de nuvem), principalmente o código backend de acesso ao banco de dados, devendo ser sempre encapsulado com repository pattern, adapter layer e centralização na camada de infraestrutura tal qual definido pelo DDD.

