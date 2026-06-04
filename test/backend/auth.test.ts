import { describe, expect, it, beforeEach } from "bun:test";
import app from "../../apps/backend/src/index";
import { sign } from "hono/jwt";

// In-memory mock stores for test state isolation
let sessionsMap = new Map<string, any>();
let kvMap = new Map<string, string>();
let configMap = new Map<string, string>();

// D1 Database Mocking class that correctly implements statement chain and binds
class MockD1Database {
  prepare(sql: string) {
    const query = sql.replace(/\s+/g, " ").trim();

    const makeExecutor = (boundArgs: any[]) => {
      const first = async () => {
        // SELECT id, cpf, name, phone, email, role FROM users WHERE cpf = ?
        if (query.includes("SELECT id, cpf, name, phone, email, role FROM users")) {
          const cpf = boundArgs[0];
          if (cpf === "12345678909") {
            return {
              id: "d9b43c68-8be0-449e-8c3a-864a66a6a2a2",
              cpf: "12345678909",
              name: "Dr. Gregory House",
              role: "MEDICO"
            };
          }
          return null;
        }

        // SELECT password_hash, salt FROM user_credentials WHERE user_id = ?
        if (query.includes("SELECT password_hash, salt FROM user_credentials")) {
          const userId = boundArgs[0];
          if (userId === "d9b43c68-8be0-449e-8c3a-864a66a6a2a2") {
            return {
              password_hash: "051e69f894f4edb10b96d812122603b41a4cd461fe1a07325674ebf13da385e1", // hash of 'senha123'
              salt: "aura_dev_salt"
            };
          }
          return null;
        }

        // SELECT id, user_cpf, current_token_jti... FROM sessions WHERE id = ?
        if (query.includes("FROM sessions WHERE id = ?")) {
          const sid = boundArgs[0];
          return sessionsMap.get(sid) || null;
        }

        // SELECT name, role FROM users WHERE cpf = ?
        if (query.includes("SELECT name, role FROM users WHERE cpf = ?")) {
          const cpf = boundArgs[0];
          if (cpf === "12345678909") {
            return { name: "Dr. Gregory House", role: "MEDICO" };
          }
          return null;
        }

        return null;
      };

      const run = async () => {
        // INSERT INTO sessions (id, user_cpf, current_token_jti, expires_at) VALUES (?, ?, ?, ?)
        if (query.includes("INSERT INTO sessions")) {
          const [sid, user_cpf, current_token_jti, expires_at] = boundArgs;
          sessionsMap.set(sid, {
            id: sid,
            user_cpf,
            current_token_jti,
            last_token_jti: null,
            penultimate_token_jti: null,
            expires_at
          });
          return { success: true };
        }

        // UPDATE sessions SET penultimate_token_jti = ... WHERE id = ?
        if (query.includes("UPDATE sessions SET")) {
          const [newJti, refreshExpiresAt, sid] = boundArgs;
          const session = sessionsMap.get(sid);
          if (session) {
            session.penultimate_token_jti = session.last_token_jti;
            session.last_token_jti = session.current_token_jti;
            session.current_token_jti = newJti;
            session.expires_at = refreshExpiresAt;
            sessionsMap.set(sid, session);
          }
          return { success: true };
        }

        // DELETE FROM sessions WHERE id = ?
        if (query.includes("DELETE FROM sessions WHERE id = ?")) {
          const sid = boundArgs[0];
          sessionsMap.delete(sid);
          return { success: true };
        }

        // DELETE FROM sessions WHERE user_cpf = ?
        if (query.includes("DELETE FROM sessions WHERE user_cpf = ?")) {
          const cpf = boundArgs[0];
          for (const [key, val] of sessionsMap.entries()) {
            if (val.user_cpf === cpf) {
              sessionsMap.delete(key);
            }
          }
          return { success: true };
        }

        return { success: true };
      };

      const all = async () => {
        // SELECT key, value FROM system_configs
        if (query.includes("SELECT key, value FROM system_configs")) {
          const configs = Array.from(configMap.entries()).map(([key, value]) => ({ key, value }));
          return { results: configs };
        }

        // SELECT id FROM sessions WHERE user_cpf = ?
        if (query.includes("SELECT id FROM sessions WHERE user_cpf = ?")) {
          const cpf = boundArgs[0];
          const results = Array.from(sessionsMap.values())
            .filter(s => s.user_cpf === cpf)
            .map(s => ({ id: s.id }));
          return { results };
        }

        return { results: [] };
      };

      return { first, run, all };
    };

    return {
      ...makeExecutor([]),
      bind: (...args: any[]) => makeExecutor(args)
    };
  }
}

// KV Store Mocking API
const mockKv = {
  put: async (key: string, value: string, options?: any) => {
    kvMap.set(key, value);
  },
  get: async (key: string) => {
    return kvMap.get(key) || null;
  }
};

describe("Backend Authentication Router", () => {
  const DB = new MockD1Database();
  const env = {
    DB,
    REVOCATION_KV: mockKv,
    JWT_SECRET: "test-secret"
  };

  beforeEach(() => {
    sessionsMap.clear();
    kvMap.clear();
    configMap.clear();
    
    // Set default seed configurations
    configMap.set("single_session_enabled", "false");
    configMap.set("jwt_ttl_seconds", "900");
    configMap.set("cookie_ttl_seconds", "604800");
  });

  describe("1. Input Schema Validation", () => {
    it("should accept valid credentials", async () => {
      const res = await app.request(
        "/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "123.456.789-09", password: "senha123" })
        },
        env
      );
      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.message).toBe("Autenticação bem-sucedida");
      expect(data.accessToken).toBeDefined();
    });

    it("should reject invalid CPF format before checking DB", async () => {
      const res = await app.request(
        "/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "123.456.789-00", password: "senha123" }) // wrong check digit
        },
        env
      );
      expect(res.status).toBe(400);
      const data: any = await res.json();
      expect(data.error).toBe("Formato de credenciais inválido");
    });

    it("should reject short password before checking DB", async () => {
      const res = await app.request(
        "/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "123.456.789-09", password: "123" })
        },
        env
      );
      expect(res.status).toBe(400);
    });

    it("should reject /refresh if refreshToken cookie is missing", async () => {
      const res = await app.request(
        "/auth/refresh",
        {
          method: "POST",
        },
        env
      );
      expect(res.status).toBe(401);
      const data: any = await res.json();
      expect(data.error).toBe("Refresh token ausente ou inválido");
    });
  });

  describe("2. Database Verification & Logic", () => {
    it("should reject login if user is not found in D1", async () => {
      const res = await app.request(
        "/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "987.654.321-00", password: "senha123" }) // Valid CPF format but not seeded
        },
        env
      );
      expect(res.status).toBe(401);
      const data: any = await res.json();
      expect(data.error).toBe("Credenciais inválidas");
    });

    it("should reject login if password hash does not match D1", async () => {
      const res = await app.request(
        "/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "123.456.789-09", password: "wrongpassword" })
        },
        env
      );
      expect(res.status).toBe(401);
    });
  });

  describe("3. Token Rotation (RTR) - Normal Flow", () => {
    it("should rotate token and update session in-place", async () => {
      // Step 1: Login to get cookie and sid
      const loginRes = await app.request(
        "/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "123.456.789-09", password: "senha123" })
        },
        env
      );
      const cookieHeader = loginRes.headers.get("Set-Cookie");
      expect(cookieHeader).toBeDefined();
      expect(cookieHeader!.toLowerCase()).toContain("path=/auth");
      const tokenMatch = cookieHeader!.match(/refreshToken=([^;]+)/);
      expect(tokenMatch).toBeDefined();
      const originalRefreshToken = tokenMatch![1]!;

      // Step 2: Extract active session in mock
      expect(sessionsMap.size).toBe(1);
      const session = Array.from(sessionsMap.values())[0];
      const originalCurrentJti = session.current_token_jti;
      expect(session.last_token_jti).toBeNull();
      expect(session.penultimate_token_jti).toBeNull();

      // Step 3: Refresh using the valid cookie
      const refreshRes = await app.request(
        "/auth/refresh",
        {
          method: "POST",
          headers: { "Cookie": `refreshToken=${originalRefreshToken}` }
        },
        env
      );
      expect(refreshRes.status).toBe(200);

      // Verify rotation in mock D1
      const updatedSession = sessionsMap.get(session.id);
      expect(updatedSession.last_token_jti).toBe(originalCurrentJti);
      expect(updatedSession.current_token_jti).not.toBe(originalCurrentJti);
    });
  });

  describe("4. Security Attacks & Reuse Detection", () => {
    it("should revoke session and return 403 when immediate parent token is reused", async () => {
      // Step 1: Login
      const loginRes = await app.request(
        "/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "123.456.789-09", password: "senha123" })
        },
        env
      );
      const originalToken = loginRes.headers.get("Set-Cookie")!.match(/refreshToken=([^;]+)/)![1]!;
      const sid = Array.from(sessionsMap.values())[0].id;

      // Step 2: Rotate once
      const refreshRes1 = await app.request(
        "/auth/refresh",
        {
          method: "POST",
          headers: { "Cookie": `refreshToken=${originalToken}` }
        },
        env
      );
      expect(refreshRes1.status).toBe(200);

      // Step 3: Re-use the original token (which is now last_token_jti)
      const reuseRes = await app.request(
        "/auth/refresh",
        {
          method: "POST",
          headers: { "Cookie": `refreshToken=${originalToken}` }
        },
        env
      );
      expect(reuseRes.status).toBe(403);
      
      // Verify session is deleted from D1 and blocked in KV
      expect(sessionsMap.has(sid)).toBe(false);
      expect(kvMap.get(`revoked:session:${sid}`)).toBe("1");
    });

    it("should revoke session and return 403 when penultimate token is reused (double delay attack)", async () => {
      // Step 1: Login
      const loginRes = await app.request(
        "/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "123.456.789-09", password: "senha123" })
        },
        env
      );
      const originalToken = loginRes.headers.get("Set-Cookie")!.match(/refreshToken=([^;]+)/)![1]!;
      const sid = Array.from(sessionsMap.values())[0].id;

      // Step 2: Rotate once (original becomes last_token)
      const refreshRes1 = await app.request(
        "/auth/refresh",
        {
          method: "POST",
          headers: { "Cookie": `refreshToken=${originalToken}` }
        },
        env
      );
      const secondToken = refreshRes1.headers.get("Set-Cookie")!.match(/refreshToken=([^;]+)/)![1]!;

      // Step 3: Rotate twice (original becomes penultimate_token)
      const refreshRes2 = await app.request(
        "/auth/refresh",
        {
          method: "POST",
          headers: { "Cookie": `refreshToken=${secondToken}` }
        },
        env
      );
      expect(refreshRes2.status).toBe(200);

      // Step 4: Re-use the original token (penultimate)
      const reuseRes = await app.request(
        "/auth/refresh",
        {
          method: "POST",
          headers: { "Cookie": `refreshToken=${originalToken}` }
        },
        env
      );
      expect(reuseRes.status).toBe(403);

      // Verify complete revocation
      expect(sessionsMap.has(sid)).toBe(false);
      expect(kvMap.get(`revoked:session:${sid}`)).toBe("1");
    });

    it("should reject refresh if refresh token JTI does not match session", async () => {
      // Create a refresh token with arbitrary JTI
      const badToken = await sign(
        { sub: "12345678909", jti: "fake-jti", sid: "fake-sid", exp: Math.floor(Date.now() / 1000) + 3600 },
        "test-secret",
        "HS256"
      );

      const res = await app.request(
        "/auth/refresh",
        {
          method: "POST",
          headers: { "Cookie": `refreshToken=${badToken}` }
        },
        env
      );
      expect(res.status).toBe(401);
    });
  });

  describe("5. Single Session Enforcement settings", () => {
    it("should allow multiple sessions for same user when single_session_enabled is false", async () => {
      configMap.set("single_session_enabled", "false");

      // Device 1 Login
      await app.request(
        "/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "123.456.789-09", password: "senha123" })
        },
        env
      );

      // Device 2 Login
      await app.request(
        "/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "123.456.789-09", password: "senha123" })
        },
        env
      );

      // Both session records exist
      expect(sessionsMap.size).toBe(2);
    });

    it("should invalidate previous sessions when single_session_enabled is true", async () => {
      configMap.set("single_session_enabled", "true");

      // Device 1 Login
      await app.request(
        "/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "123.456.789-09", password: "senha123" })
        },
        env
      );
      expect(sessionsMap.size).toBe(1);
      const oldSid = Array.from(sessionsMap.keys())[0]!;

      // Device 2 Login
      await app.request(
        "/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "123.456.789-09", password: "senha123" })
        },
        env
      );

      // Only new session exists, old is deleted and blocklisted in KV
      expect(sessionsMap.size).toBe(1);
      expect(sessionsMap.has(oldSid)).toBe(false);
      expect(kvMap.get(`revoked:session:${oldSid}`)).toBe("1");
    });
  });

  describe("6. Logout / Fast Revocation", () => {
    it("should delete session and blocklist sid on logout", async () => {
      // Step 1: Login
      const loginRes = await app.request(
        "/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "123.456.789-09", password: "senha123" })
        },
        env
      );
      const token = loginRes.headers.get("Set-Cookie")!.match(/refreshToken=([^;]+)/)![1]!;
      const sid = Array.from(sessionsMap.values())[0].id;

      // Step 2: Logout
      const logoutRes = await app.request(
        "/auth/logout",
        {
          method: "POST",
          headers: { "Cookie": `refreshToken=${token}` }
        },
        env
      );
      expect(logoutRes.status).toBe(200);

      // Session deleted and revoked in KV
      expect(sessionsMap.has(sid)).toBe(false);
      expect(kvMap.get(`revoked:session:${sid}`)).toBe("1");
    });
  });

  describe("7. Path and Domain Isolation", () => {
    const isolatedEnv = {
      ...env,
      API_DOMAIN: "api.clinicaexemplo.com.br"
    };

    it("should accept request on /auth with correct Host header", async () => {
      const res = await app.request(
        "/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Host": "api.clinicaexemplo.com.br"
          },
          body: JSON.stringify({ username: "123.456.789-09", password: "senha123" })
        },
        isolatedEnv
      );
      expect(res.status).toBe(200);
    });

    it("should reject request with incorrect Host header on /auth routes", async () => {
      const res = await app.request(
        "/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Host": "invalid-host.com"
          },
          body: JSON.stringify({ username: "123.456.789-09", password: "senha123" })
        },
        isolatedEnv
      );
      expect(res.status).toBe(403);
      const data: any = await res.json();
      expect(data.error).toBe("Acesso negado");
      expect(data.code).toBe("JQ487");
    });
  });
});
