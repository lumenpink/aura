---
title: Mapeamento do Banco D1
description: Esquema do banco de dados D1 (SQLite na borda) no Cloudflare.
---

O monorepo utiliza o banco relacional gerenciado **Cloudflare D1** como banco de dados transacional.

## Estrutura de Tabelas

### 1. `users`
Tabela contendo os dados cadastrais básicos dos usuários da clínica.
- `id`: TEXT (UUID) - Primary Key
- `cpf`: TEXT (Unique) - Índice de login
- `name`: TEXT - Nome completo
- `role`: TEXT - Perfil de acesso (MEDICO, ADMIN, RECEPCAO)

### 2. `sessions`
Tabela para controle de sessões ativas e suporte a RTR.
- `id`: TEXT (UUID) - Primary Key
- `user_cpf`: TEXT - Chave estrangeira de referência do usuário
- `current_token_jti`: TEXT - ID único do refresh token atual emitido
- `last_token_jti`: TEXT (Nullable) - ID único do refresh token imediatamente anterior
- `penultimate_token_jti`: TEXT (Nullable) - ID único do penúltimo refresh token emitido
- `expires_at`: INTEGER - Timestamp de expiração do cookie
