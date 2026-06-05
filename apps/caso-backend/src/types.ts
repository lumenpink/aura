export interface Bindings {
  D1_MAIN?: D1Database;
  D1_ANALYTICS?: D1Database;
  REVOCATION_KV?: KVNamespace;
  SYNC_BUCKET?: R2Bucket;
  ALLOWED_ORIGINS_CASO?: string;
  ALLOWED_ORIGINS?: string;
  VITE_FLUXO_API_URL?: string;
}
