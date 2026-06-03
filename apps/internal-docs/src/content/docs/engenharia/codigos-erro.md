---
title: Códigos de Erro do Sistema
description: Guia de referência para códigos de erro internos e ofuscados de segurança do ecossistema Aura.
---

Este documento serve como referência técnica para os códigos de erro internos emitidos pelo ecossistema Aura. Em ambientes de produção, detalhes específicos sobre topologia de rede e restrições de infraestrutura são ofuscados sob estes códigos para mitigar o vazamento de informações para potenciais atacantes (segurança por ofuscação).

## Códigos de Isolamento de Subdomínio

Os códigos abaixo referem-se a tentativas de requisição originadas ou direcionadas a subdomínios incorretos do ecossistema.

### JQ487 - Restrição de Subdomínio de Refresh

Este código é retornado quando uma requisição tenta acessar a rota de rotação de refresh token fora do subdomínio isolado e seguro de autenticação.

- **Código HTTP**: `403 Forbidden`
- **Mensagem do Erro**: `Acesso negado`
- **Causa**: Uma requisição POST foi direcionada para `/api/auth/refresh` usando o domínio de gateway de API geral (`api-aura.2lp.in`) em vez do subdomínio dedicado de autenticação (`auth-aura.2lp.in`).
- **Impacto de Segurança**: Como o cookie `refreshToken` é configurado com escopo restrito (`COOKIE_DOMAIN=auth-aura.2lp.in`), a rotação do token só é válida se executada sob o contexto do mesmo subdomínio. Chamadas em outros domínios são sumariamente rejeitadas para evitar sequestro de sessão ou vazamento de cookies.
- **Resolução**: Certifique-se de que o cliente frontend está devidamente configurado com a variável de ambiente `VITE_AUTH_URL` apontando para o domínio correto e que as chamadas de refresh utilizem esta URL base.

---

### JQ488 - Restrição de Rota do Subdomínio de Autenticação

Este código é retornado quando uma requisição tenta acessar rotas gerais de API, login ou logout por meio do subdomínio dedicado ao refresh token.

- **Código HTTP**: `403 Forbidden`
- **Mensagem do Erro**: `Acesso negado`
- **Causa**: Uma chamada para `/api/auth/login`, `/api/auth/logout` ou qualquer outro endpoint geral de API foi enviada para o subdomínio de autenticação (`auth-aura.2lp.in`).
- **Impacto de Segurança**: O subdomínio `auth-aura.2lp.in` é isolado especificamente para expor a rota `/refresh`, minimizando a superfície de ataque para as credenciais principais e garantindo que cookies HTTP-only de refresh não sejam expostos a caminhos ou fluxos que processam outras lógicas da aplicação.
- **Resolução**: Ajuste o roteamento do cliente frontend para direcionar fluxos de login, logout e consultas gerais à API para o gateway correspondente definido em `VITE_API_URL` (`api-aura.2lp.in`).
