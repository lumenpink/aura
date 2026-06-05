---
title: Segurança & Rotação de Tokens
description: Políticas e implementação de segurança e RTR (Refresh Token Rotation) na Aura.
---

Políticas de gerenciamento de tokens e mitigação de vulnerabilidades do monorepo Aura nas aplicações Fluxo, Traço e Pulso.

## Token Strategy

1. **Access Token (JWT)**:
   - TTL curto: 15 minutos.
   - Guardado em memória no lado cliente.
2. **Refresh Token (JWT)**:
   - TTL longo: 7 dias.
   - Armazenado em cookie seguro HTTP-Only com as tags `Secure`, `SameSite=Strict` e `path="/auth"`.
   - O isolamento do cookie usando o path `/auth` garante que o navegador só envie o token em rotas de validação de identidade e renovação, bloqueando o envio automático para a API operacional em `/api/*`.

## Rotação de Refresh Tokens (RTR)

A cada requisição à rota `/auth/refresh`, um novo par de Access/Refresh Token é emitido. O token de refresh anterior é revogado e armazenado no banco/KV para detecção de tentativas de reuso. Se um token de refresh expirado ou reusado for detectado pelo backend, a sessão correspondente é totalmente invalidada no D1/KV, protegendo a conta contra vazamentos de sessão e sequestros de cookies.
