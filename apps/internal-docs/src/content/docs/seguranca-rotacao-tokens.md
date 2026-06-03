---
title: Segurança & Rotação de Tokens
description: Políticas e implementação de segurança e RTR (Refresh Token Rotation) na Aura.
---

Políticas de gerenciamento de tokens e mitigação de vulnerabilidades do monorepo Aura.

## Token Strategy

1. **Access Token (JWT)**:
   - TTL curto: 15 minutos.
   - Guardado em memória no lado cliente.
2. **Refresh Token (JWT)**:
   - TTL longo: 7 dias.
   - Armazenado em cookie seguro HTTP-Only com as tags `Secure`, `SameSite=Strict`, e `path="/"`.

## Rotação de Refresh Tokens (RTR)

A cada requisição à rota `/refresh`, um novo par de Access/Refresh Token é emitido. O token de refresh anterior é revogado e armazenado no banco/KV para detecção de tentativas de reuso (se um token antigo for reutilizado, toda a sessão é invalidada).
