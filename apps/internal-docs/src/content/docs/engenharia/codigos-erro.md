---
title: Códigos de Erro do Sistema
description: Guia de referência para códigos de erro internos e ofuscados de segurança do ecossistema Aura.
---

Este documento serve como referência técnica para os códigos de erro internos emitidos pelo ecossistema Aura. Em ambientes de produção, detalhes específicos sobre topologia de rede e restrições de infraestrutura são ofuscados sob estes códigos para mitigar o vazamento de informações para potenciais atacantes (segurança por ofuscação).

## Códigos de Isolamento de Rota e Domínio

Os códigos abaixo referem-se a tentativas de requisição originadas ou direcionadas a domínios ou caminhos incorretos do ecossistema.

### JQ487 - Restrição de Rota e Domínio de Autenticação

Este código é retornado quando uma requisição tenta acessar as rotas de autenticação fora do domínio principal da API ou fora do diretório de caminho restrito `/auth`.

- **Código HTTP**: `403 Forbidden`
- **Mensagem do Erro**: `Acesso negado`
- **Causa**: Uma requisição de autenticação foi direcionada usando um host inválido ou um prefixo de caminho que não inicia com `/auth`.
- **Impacto de Segurança**: Garante que todas as chamadas de autenticação sejam restritas ao caminho protegido `/auth`, permitindo que os navegadores isolem o cookie `refreshToken` usando a restrição `path: "/auth"`.
- **Resolução**: Ajuste o cliente frontend para direcionar chamadas ao gateway correto definido em `VITE_API_URL` (`api.clinicaexemplo.com.br`) sob o caminho `/auth/*`.

---

### JQ488 - Restrição de Domínio de API

Este código é retornado quando uma requisição tenta acessar rotas gerais de API operacional por meio de um domínio de host não autorizado.

- **Código HTTP**: `403 Forbidden`
- **Mensagem do Erro**: `Acesso negado`
- **Causa**: Uma chamada direcionada às APIs operacionais (como `/api/patients`, `/api/agenda`) foi enviada utilizando um domínio de host incorreto.
- **Impacto de Segurança**: O gateway de API operacional (`api.clinicaexemplo.com.br`) é isolado e validado pelo Hono para garantir que requisições de dados sensíveis de pacientes e agendas não sejam aceitas por canais não autorizados ou hosts não cadastrados.
- **Resolução**: Ajuste o frontend ou cliente de API para direcionar requisições à API operacional para o domínio correspondente em `VITE_API_URL` (`api.clinicaexemplo.com.br`).
