import { z } from "zod";
import { viteApiUrlSchema, allowedOriginsSchema } from "./domain.schema";

// Helper to pre-process empty or blank strings to undefined
const emptyToUndefined = (val: unknown) => {
  if (typeof val === "string" && val.trim() === "") return undefined;
  return val;
};

export const envSchema = z.object({
  // Aura Fluxo Configurations
  VITE_FLUXO_API_URL: z.preprocess(
    emptyToUndefined,
    viteApiUrlSchema.optional().default("http://fluxo-api.localhost:12202" as any)
  ),
  ALLOWED_ORIGINS_FLUXO: z.preprocess(
    emptyToUndefined,
    allowedOriginsSchema.optional().default("http://fluxo.localhost:12201" as any)
  ),

  // Aura Traço Configurations
  VITE_TRACO_API_URL: z.preprocess(
    emptyToUndefined,
    viteApiUrlSchema.optional().default("http://traco-api.localhost:12302" as any)
  ),
  ALLOWED_ORIGINS_TRACO: z.preprocess(
    emptyToUndefined,
    allowedOriginsSchema.optional().default("http://traco.localhost:12301" as any)
  ),

  // Aura Pulso Configurations
  VITE_PULSO_API_URL: z.preprocess(
    emptyToUndefined,
    viteApiUrlSchema.optional().default("http://pulso-api.localhost:12402" as any)
  ),
  ALLOWED_ORIGINS_PULSO: z.preprocess(
    emptyToUndefined,
    allowedOriginsSchema.optional().default("http://pulso.localhost:12401" as any)
  ),
});

export type EnvConfig = z.infer<typeof envSchema>;
