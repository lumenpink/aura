---
title: Arquitetura do Monorepo
description: Especificações e organização estrutural do monorepo Aura.
---

Este documento detalha a estrutura de workspaces e a distribuição de pacotes no monorepo do Projeto Aura.

## Visão Geral

O projeto adota uma estrutura baseada em NPM/Bun Workspaces dividida da seguinte forma:

- **`packages/shared`**: Biblioteca compartilhada de utilitários e validações baseadas em Zod.
- **`apps/backend`**: Microsserviço de autenticação rodando em Cloudflare Workers (Hono).
- **`apps/frontend`**: Aplicação cliente principal em React (Vite + Tailwind CSS).
- **`apps/internal-docs`**: Trilha de engenharia gerada via Starlight (Astro).
- **`apps/user-manual`**: Manual de operação do usuário final gerado via Starlight (Astro).

## Regras de Dependências

1. Nenhum aplicativo deve cruzar dependências diretamente; todo código compartilhado deve ser centralizado em `packages/shared`.
2. A tipagem do back-end é exposta diretamente via RPC client no front-end para chamadas com segurança de tipos fim-a-fim.
