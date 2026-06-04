import type { D1Database, KVNamespace } from '@cloudflare/workers-types';

/**
 * Environment bindings injected by Cloudflare Workers.
 */
export interface Bindings {
  // Operational Database (OLTP)
  D1_MAIN: D1Database;
  
  // Analytics and Reporting Database (OLAP)
  D1_ANALYTICS: D1Database;
  
  // Session revocation KV store
  REVOCATION_KV?: KVNamespace;
  
  // Domain routing validations
  API_DOMAIN: string;
  
  // Security and routing variables
  JWT_SECRET?: string;
  VITE_API_URL?: string;
}

/**
 * Hono Application Environment configuration.
 */
export interface AppEnv {
  Bindings: Bindings;
}
